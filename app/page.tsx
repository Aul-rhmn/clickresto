import { ProductCard } from "@/components/product-card"
import { SiteHeader } from "@/components/site-header"

import { headers } from "next/headers"

async function getProducts() {

 const host = headers().get("host")
const protocol = process.env.NODE_ENV === "production" ? "https" : "http"
const baseUrl = `${protocol}://${host}`

  const res = await fetch(`${baseUrl}/api/products`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch products");
  }

  const data = await res.json()
  return data.products as Array<{
    id: string
    name: string
    description: string | null
    price: number
    image_url: string | null
  }>
}

export default async function Page() {
  const products = await getProducts()
  return (
    <main>
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <h1 className="text-balance text-3xl md:text-4xl font-semibold">Makan Enak, Cepat, dan Nyaman</h1>
          <p className="text-pretty text-muted-foreground">
            Pilih makanan/minuman favorit Anda. Tambah ke keranjang, bayar aman, dan pesanan terkonfirmasi otomatis.
          </p>
          <div className="flex items-center gap-3">
            <a href="#menu">
              <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
                Lihat Menu
              </button>
            </a>
            <a href="/checkout" className="text-sm text-muted-foreground hover:text-foreground">
              Lihat Keranjang
            </a>
          </div>
        </div>
        <div className="relative">
          <div className="relative w-full aspect-[4/3] overflow-hidden rounded-xl border bg-card">
            {/* decorative hero image placeholder */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/restaurant-hero-food-scene.jpg"
              alt="Ilustrasi makanan lezat di restoran"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section id="menu" className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-balance">Menu</h2>
            <p className="text-muted-foreground">Pilih makanan/minuman favorit Anda.</p>
          </div>
          <span className="hidden md:inline-block h-2 w-10 rounded-full bg-primary/20" aria-hidden="true" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </main>
  )
}
