import { type NextRequest, NextResponse } from "next/server"
import { getServerSupabase } from "@/lib/supabase/server"
import { getAdminSupabase } from "@/lib/supabase/admin"
import crypto from "crypto"

async function ensureBucket() {
  const admin = getAdminSupabase()
  const { data: buckets, error: listErr } = await admin.storage.listBuckets()
  if (listErr) {
    // try to create anyway; ignore "already exists"
    const { error: createErr } = await admin.storage.createBucket("products", {
      public: true,
      fileSizeLimit: "10MB",
      allowedMimeTypes: ["image/*"],
    })
    if (createErr && !`${createErr.message ?? ""}`.toLowerCase().includes("already")) {
      throw createErr
    }
    return
  }
  const exists = buckets?.some((b) => b.name === "products")
  if (!exists) {
    const { error: createErr } = await admin.storage.createBucket("products", {
      public: true,
      fileSizeLimit: "10MB",
      allowedMimeTypes: ["image/*"],
    })
    if (createErr && !`${createErr.message ?? ""}`.toLowerCase().includes("already")) {
      throw createErr
    }
  }
}

function extractAIData(raw: any): { name?: any; description?: any; price?: any } {
  const candidates = [raw, raw?.data, raw?.result, raw?.output, raw?.payload]
  for (const c of candidates) {
    if (c && (c.name !== undefined || c.price !== undefined || c.description !== undefined)) return c
  }
  return raw ?? {}
}

function deriveNameFromFilename(filename: string): string {
  const base = filename?.split(".")?.slice(0, -1)?.join(".") || filename || ""
  return base
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

// Parse common Indonesian formats: "Rp 25.000", "25rb", "25k", "1 jt", "1 juta", "1m"
function parsePriceToNumber(input: unknown): number | null {
  if (typeof input === "number") return input > 0 ? input : null
  if (typeof input !== "string") return null

  const s = input.trim().toLowerCase()
  // 1) jt/juta/m → millions
  const jtMatch = s.match(/(\d+(?:[.,]\d+)?)\s*(jt|juta|m)\b/)
  if (jtMatch) {
    const base = Number.parseFloat(jtMatch[1].replace(",", "."))
    if (Number.isFinite(base) && base > 0) return Math.round(base * 1_000_000)
  }
  // 2) rb/k → thousands
  const rbMatch = s.match(/(\d+(?:[.,]\d+)?)\s*(rb|k)\b/)
  if (rbMatch) {
    const base = Number.parseFloat(rbMatch[1].replace(",", "."))
    if (Number.isFinite(base) && base > 0) return Math.round(base * 1_000)
  }
  // 3) Fallback: strip non-digits
  const digits = s.replace(/rp|idr|\s/gi, "").replace(/[^0-9]/g, "")
  if (!digits) return null
  const n = Number.parseInt(digits, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getServerSupabase()
    const admin = getAdminSupabase()

    const form = await req.formData()
    const file = form.get("image") as File | null
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

    await ensureBucket()

    const ext = file.name.split(".").pop() || "jpg"
    const path = `products/${crypto.randomUUID()}.${ext}`

    const { error: upErr } = await admin.storage.from("products").upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    })
    if (upErr) throw upErr

    const { data: pub } = admin.storage.from("products").getPublicUrl(path)
    const imageUrl = pub?.publicUrl
    if (!imageUrl) {
      return NextResponse.json({ error: "Failed to get public URL" }, { status: 500 })
    }

    const webhook = process.env.N8N_WEBHOOK_URL
    if (!webhook) {
      return NextResponse.json({ error: "Missing N8N_WEBHOOK_URL" }, { status: 500 })
    }

    const aiResp = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl }),
    })
    if (!aiResp.ok) {
      const txt = await aiResp.text()
      return NextResponse.json({ error: `n8n error: ${txt}` }, { status: 502 })
    }
    const aiRaw = await aiResp.json()
    const aiData = extractAIData(aiRaw) as { name?: string; description?: string; price?: number | string }

    const nameRaw = (aiData?.name || "").trim()
    const name = nameRaw || deriveNameFromFilename(file.name)

    const priceParsed = parsePriceToNumber(aiData?.price as any)

    // Debug logs to help diagnose extraction issues (visible in v0_app_debug_logs)
    console.log("[v0] AI raw payload:", aiRaw)
    console.log("[v0] AI parsed values:", { name, priceParsed })

    if (!name || !priceParsed) {
      return NextResponse.json(
        {
          error: "AI extraction returned invalid data",
          details: { received: aiRaw, parsed: { name, price: priceParsed } },
        },
        { status: 422 },
      )
    }

    const price = Math.round(priceParsed * 100)

    const { data: product, error: insErr } = await admin
      .from("products")
      .insert({
        name,
        description: aiData.description ?? null,
        price,
        image_url: imageUrl,
      })
      .select("id,name,description,price,image_url")
      .single()
    if (insErr) throw insErr

    return NextResponse.json({ product })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
