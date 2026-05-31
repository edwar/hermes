"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import type { CreateSaleInput } from "../schemas/sale-schema"

async function createSale(data: CreateSaleInput) {
  const res = await fetch("/api/sales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    let message = `Error ${res.status} al procesar venta`
    try {
      const err = await res.json()
      message = err?.error?.message ?? err?.error ?? err?.message ?? message
    } catch {
      try {
        const text = await res.text()
        if (text && text.length < 200) message = text
      } catch {
        // use default
      }
    }
    throw new Error(message)
  }
  return res.json()
}

export function useCheckout() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: createSale,
    onSuccess: (sale) => {
      toast.success("Venta registrada exitosamente")
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      return sale
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}
