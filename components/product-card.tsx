"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useCart } from "@/hooks/use-cart"

type Product = {
  id: string
  name: string
  description: string | null
  price: number // in cents
  image_url: string | null
}

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()
  return (
    <div className="group rounded-lg border bg-card p-4 flex flex-col gap-3 transition hover:shadow-md">
      <div className="relative w-full aspect-square overflow-hidden rounded-md bg-muted">
        <Image
          src={product.image_url || "/placeholder.svg?height=600&width=600&query=food%20photo"}
          alt={product.name}
          fill
          className="object-cover transition duration-300 group-hover:scale-[1.02]"
          sizes="(max-width: 640px) 100vw, 33vw"
        />
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="font-medium text-pretty">{product.name}</h3>
          {product.description ? (
            <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-foreground">
          Rp {(product.price / 100).toLocaleString("id-ID")}
        </span>
      </div>
      <Button onClick={() => addItem(product)} className="w-full">
        Add to Cart
      </Button>
    </div>
  )
}
