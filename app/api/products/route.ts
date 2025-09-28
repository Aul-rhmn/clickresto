import { NextResponse } from "next/server"
import { getServerSupabase } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = getServerSupabase()
    const { data, error } = await supabase
      .from("products")
      .select("id,name,description,price,image_url")
      .order("created_at", { ascending: false })

    if (error) throw error

    // If there are no products yet, insert one demo item (no image required).
    if (!data || data.length === 0) {
      const fallback = {
        name: "Nasi Goreng Spesial (Demo)",
        description: "Item demo untuk uji checkout end-to-end tanpa gambar.",
        // DB stores cents; UI divides by 100, Midtrans uses IDR (converted in checkout route)
        price: 25000 * 100,
        image_url: null,
      }
      const { data: inserted, error: insErr } = await supabase
        .from("products")
        .insert(fallback)
        .select("id,name,description,price,image_url")
        .single()
      if (insErr) throw insErr
      return NextResponse.json({ products: [inserted] })
    }

    return NextResponse.json({ products: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
