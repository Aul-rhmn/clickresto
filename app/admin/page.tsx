"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function AdminPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    setMessage(null)
    try {
      const form = new FormData()
      form.append("image", file)
      const res = await fetch("/api/admin/upload", { method: "POST", body: form })

      // coba baca JSON; jika gagal, fallback ke text
      let payload: any = null
      try {
        payload = await res.json()
      } catch {
        try {
          const txt = await res.text()
          payload = { error: txt }
        } catch {
          payload = null
        }
      }

      if (!res.ok) {
        const reason = payload?.error || payload?.message || "Gagal memproses. Pastikan n8n webhook & env terpasang."
        const details = payload?.details ? ` | details: ${JSON.stringify(payload.details)}` : ""
        throw new Error(`${reason}${details}`)
      }

      const data = payload
      setMessage(`Produk ditambahkan: ${data.product.name} (Rp ${(data.product.price / 100).toLocaleString("id-ID")})`)
    } catch (e: any) {
      setMessage(e?.message || "Gagal memproses. Pastikan n8n webhook & env terpasang.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4">
        <a
          href="/"
          className="inline-flex items-center text-sm px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition"
        >
          ← Kembali ke Beranda
        </a>
      </div>
      <h1 className="text-2xl font-semibold mb-2">Admin Panel</h1>
      <p className="text-muted-foreground mb-6">
        Upload foto produk. Backend akan mengekstrak nama, deskripsi, dan harga menggunakan AI (LangChain di n8n).
      </p>
      <div className="border rounded-lg p-4 flex flex-col gap-4">
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block" />
        <Button onClick={handleUpload} disabled={!file || loading}>
          {loading ? "Memproses..." : "Upload & Proses"}
        </Button>
        {message ? <p className="text-sm text-foreground/90">{message}</p> : null}
        <p className="text-xs text-muted-foreground">
          Produk baru akan otomatis muncul di landing page setelah tersimpan.
        </p>
      </div>
    </main>
  )
}
