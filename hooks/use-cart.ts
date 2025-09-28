"use client"

import useSWR, { mutate } from "swr"

type CartItem = {
  id: string
  name: string
  price: number
  image_url: string | null
  quantity: number
}
type CartState = {
  items: CartItem[]
}

const KEY = "cart"

function readLocal(): CartState {
  if (typeof window === "undefined") return { items: [] }
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : { items: [] }
  } catch {
    return { items: [] }
  }
}

function writeLocal(state: CartState) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(KEY, JSON.stringify(state))
}

export function useCart() {
  const { data } = useSWR<CartState>(KEY, async () => readLocal(), {
    fallbackData: { items: [] },
    revalidateOnFocus: false,
  })
  const state = data!

  function persist(next: CartState) {
    writeLocal(next)
    mutate(KEY, next, false)
  }

  function addItem(p: { id: string; name: string; price: number; image_url: string | null }) {
    const items = [...state.items]
    const idx = items.findIndex((it) => it.id === p.id)
    if (idx >= 0) {
      items[idx] = { ...items[idx], quantity: items[idx].quantity + 1 }
    } else {
      items.push({ ...p, quantity: 1 })
    }
    persist({ items })
  }

  function removeItem(id: string) {
    const items = state.items.filter((it) => it.id !== id)
    persist({ items })
  }

  function decItem(id: string) {
    const items = state.items
      .map((it) => (it.id === id ? { ...it, quantity: it.quantity - 1 } : it))
      .filter((it) => it.quantity > 0)
    persist({ items })
  }

  function clear() {
    persist({ items: [] })
  }

  const total = state.items.reduce((sum, it) => sum + it.price * it.quantity, 0)

  return { ...state, addItem, removeItem, decItem, clear, total }
}
