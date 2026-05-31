"use client"

import { useState, useCallback } from "react"
import type { CartItem } from "../types"

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState("")
  const [customerId, setCustomerId] = useState<string | undefined>()
  const [notes, setNotes] = useState("")
  const [requestElectronicInvoice, setRequestElectronicInvoice] = useState(false)

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
