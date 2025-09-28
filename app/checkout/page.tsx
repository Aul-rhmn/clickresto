"use client"

import { useCart } from "@/hooks/use-cart"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export default function CheckoutPage() {
  const { items, total, addItem, decItem, removeItem, clear } = useCart()
  const [loading, setLoading] = useState(false)

  async function handlePay() {
    setLoading(true)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      })
      const data = await res.json().catch(() => null as any)
      if (!res.ok) {
        const msg = (data && (data.error || data.message)) || "Failed to create transaction"
        const details = data && (data.details || data.detail || data.response || null)
        throw new Error(details ? `${msg}: ${typeof details === "string" ? details : JSON.stringify(details)}` : msg)
      }
      if (!data?.redirect_url) {
        throw new Error("Missing redirect URL from Midtrans")
      }
      window.location.href = data.redirect_url
    } catch (e: any) {
      alert(`Checkout gagal: ${e?.message || "Coba lagi."}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main>
      {/* simple header without import to avoid circular */}
      <div className="w-full border-b bg-background">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <h1 className="text-xl font-semibold">Checkout</h1>
        </div>
      </div>
      <section className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {items.length === 0 ? (
            <p className="text-muted-foreground">Keranjang kosong.</p>
          ) : (
            items.map((it) => (
              <div key={it.id} className="flex items-center gap-4 border rounded-lg p-3">
                <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted">
                  <Image
                    src={it.image_url || "/placeholder.svg?height=120&width=120&query=food%20photo"}
                    alt={it.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{it.name}</div>
                  <div className="text-sm text-muted-foreground">Rp {(it.price / 100).toLocaleString("id-ID")}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => decItem(it.id)}>
                    -
                  </Button>
                  <span className="w-8 text-center">{it.quantity}</span>
                  <Button variant="secondary" onClick={() => addItem(it)}>
                    +
                  </Button>
                </div>
                <Button variant="ghost" onClick={() => removeItem(it.id)}>
                  Hapus
                </Button>
              </div>
            ))
          )}
        </div>
        <aside className="border rounded-lg p-4 h-fit sticky top-4">
          <div className="flex items-center justify-between mb-2">
            <span>Total</span>
            <span className="font-semibold">Rp {(total / 100).toLocaleString("id-ID")}</span>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={handlePay} disabled={items.length === 0 || loading}>
              {loading ? "Memproses..." : "Bayar"}
            </Button>
            <Button variant="secondary" onClick={clear} disabled={items.length === 0}>
              Kosongkan
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Setelah pembayaran berhasil, status order akan otomatis terkonfirmasi.
          </p>
        </aside>
      </section>
    </main>
  )
}
