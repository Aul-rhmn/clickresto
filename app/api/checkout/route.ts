import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getServerSupabase } from "@/lib/supabase/server"

type Item = { id: string; name: string; price: number; image_url: string | null; quantity: number }

function resolveBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_VERCEL_URL
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  // Ensure absolute URL
  return `https://${raw}`
}

function getMidtransEndpoint(serverKey: string) {
  // Sandbox keys usually start with "SB-". Production keys usually do not.
  const isSandbox = serverKey.startsWith("SB-")
  return isSandbox
    ? "https://app.sandbox.midtrans.com/snap/v1/transactions"
    : "https://app.midtrans.com/snap/v1/transactions"
}

export async function POST(req: NextRequest) {
  try {
    const { items } = (await req.json()) as { items: Item[] }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items" }, { status: 400 })
    }

    // Internally we keep cents for DB totals, but Midtrans requires integer Rupiah.
    const itemDetails = items.map((it) => {
      const priceRp = Math.max(0, Math.round(it.price / 100)) // cents -> Rp (integer)
      return {
        id: it.id,
        name: it.name.slice(0, 50),
        price: priceRp,
        quantity: it.quantity,
      }
    })
    const grossAmount = itemDetails.reduce((sum, d) => sum + d.price * d.quantity, 0)
    if (!Number.isFinite(grossAmount) || grossAmount < 1) {
      return NextResponse.json({ error: "Invalid total", details: { grossAmount, itemDetails } }, { status: 400 })
    }

    const total = items.reduce((s, it) => s + it.price * it.quantity, 0)
    const orderId = `order_${crypto.randomUUID()}`
    // Insert order + items as pending
    const supabase = getServerSupabase()
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        external_id: orderId,
        status: "pending",
        total,
      })
      .select("id, external_id")
      .single()
    if (orderErr) throw orderErr
    const itemsRows = items.map((it) => ({
      order_id: order.id,
      product_id: it.id,
      quantity: it.quantity,
      price: it.price,
    }))
    const { error: oiErr } = await supabase.from("order_items").insert(itemsRows)
    if (oiErr) throw oiErr

    // Midtrans Snap
    const serverKey = process.env.MIDTRANS_SERVER_KEY
    if (!serverKey) throw new Error("Missing MIDTRANS_SERVER_KEY")
    const auth = Buffer.from(`${serverKey}:`).toString("base64")

    const baseUrl = resolveBaseUrl()
    const payload: any = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      item_details: itemDetails,
    }
    if (baseUrl) {
      payload.callbacks = {
        finish: `${baseUrl}/checkout`,
      }
    }

    const endpoint = getMidtransEndpoint(serverKey)
    console.log("[v0] Midtrans payload summary", {
      endpoint,
      orderId,
      itemsCount: items.length,
      totalCents: total,
      grossAmount,
      itemsSum: itemDetails.reduce((s, d) => s + d.price * d.quantity, 0),
      hasBaseUrl: !!baseUrl,
    })

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    })

    if (!resp.ok) {
      const raw = await resp.text()
      let details: any = raw
      try {
        details = JSON.parse(raw)
      } catch {
        // keep raw text
      }
      console.log("[v0] Midtrans rejected payload", { status: resp.status, details })
      return NextResponse.json({ error: "Midtrans rejected payload", details }, { status: 502 })
    }

    const data = await resp.json()
    if (!data?.redirect_url) {
      console.log("[v0] Midtrans response missing redirect_url", { data })
      return NextResponse.json({ error: "Midtrans response missing redirect_url", details: data }, { status: 502 })
    }
    return NextResponse.json({ redirect_url: data.redirect_url })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
