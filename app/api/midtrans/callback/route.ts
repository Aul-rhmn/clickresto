import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getServerSupabase } from "@/lib/supabase/server"

function verifySignature(body: any, serverKey: string) {
  const raw = `${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`
  const hash = crypto.createHash("sha512").update(raw).digest("hex")
  return hash === body.signature_key
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const serverKey = process.env.MIDTRANS_SERVER_KEY
    if (!serverKey) throw new Error("Missing MIDTRANS_SERVER_KEY")
    if (!verifySignature(body, serverKey)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
    const statusMap: Record<string, "pending" | "paid" | "failed"> = {
      settlement: "paid",
      capture: "paid",
      pending: "pending",
      deny: "failed",
      cancel: "failed",
      expire: "failed",
      refund: "failed",
      partial_refund: "failed",
      chargeback: "failed",
      partial_chargeback: "failed",
      failure: "failed",
    }
    const status: "pending" | "paid" | "failed" = statusMap[body.transaction_status] ?? "pending"

    const supabase = getServerSupabase()
    const { error } = await supabase.from("orders").update({ status }).eq("external_id", body.order_id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
