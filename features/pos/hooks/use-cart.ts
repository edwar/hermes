"use client"

import { useState, useCallback, useEffect } from "react"
import type { CartItem, CartState } from "../types"

const CART_STORAGE_KEY = "hermes-pos-cart"

function loadCart(): CartState {
  if (typeof window === "undefined") return { items: [] }
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return { items: [] }
    return JSON.parse(raw) as CartState
  } catch {
    return { items: [] }
  }
}

function saveCart(state: CartState) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage full or unavailable
  }
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => loadCart().items)
  const [customerName, setCustomerName] = useState(() => loadCart().customerName ?? "")
  const [customerId, setCustomerId] = useState<string | undefined>(() => loadCart().customerId)
  const [notes, setNotes] = useState(() => loadCart().notes ?? "")
  const [requestElectronicInvoice, setRequestElectronicInvoice] = useState(false)

  useEffect(() => {
    saveCart({ items, customerName, customerId, notes })
  }, [items, customerName, customerId, notes])

  const addItem = useCallback((product: {
    id: string
    name: string
    barcode?: string | null
    price: number
    stock: number
  }) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return prev
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price }
            : i
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          barcode: product.barcode,
          price: Number(product.price),
          quantity: 1,
          subtotal: Number(product.price),
          stock: product.stock,
        },
      ]
    })
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.productId !== productId)
        : prev.map((i) => {
            if (i.productId !== productId) return i
            const qty = Math.min(quantity, i.stock)
            return { ...i, quantity: qty, subtotal: qty * i.price }
          })
    )
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    setCustomerName("")
    setCustomerId(undefined)
    setNotes("")
    setRequestElectronicInvoice(false)
    try {
      localStorage.removeItem(CART_STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0)
  const tax = Math.round(subtotal * 0.19)
  const total = subtotal + tax

  return {
    items,
    customerName,
    customerId,
    notes,
    requestElectronicInvoice,
    setCustomerName,
    setCustomerId,
    setNotes,
    setRequestElectronicInvoice,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    tax,
    total,
    isEmpty: items.length === 0,
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
  }
}
