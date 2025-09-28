"use client"

import Link from "next/link"
import { useCart } from "@/hooks/use-cart"
import { Button } from "@/components/ui/button"

export function SiteHeader() {
  const { items } = useCart()
  const count = items.reduce((n, it) => n + it.quantity, 0)
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          {/* minimal brand mark */}
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" aria-hidden="true" />
          Click Resto
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/#menu" className="text-sm text-muted-foreground hover:text-foreground">
            Menu
          </Link>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            Admin
          </Link>
          <Link href="/checkout">
            <Button variant="default">Cart {count > 0 ? `(${count})` : ""}</Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}
