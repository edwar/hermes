"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import type { CreateStockMovementInput } from "../schemas/stock-movement-schema"

export interface StockMovementFilters {
  productId?: string
  type?: string
  page?: number
  pageSize?: number
}

async function fetchMovements(filters: StockMovementFilters = {}) {
  const params = new URLSearchParams()
  if (filters.productId) params.set("productId", filters.productId)
  if (filters.type) params.set("type", filters.type)
  if (filters.page) params.set("page", String(filters.page))
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize))

  const res = await fetch(`/api/stock-movements?${params}`)
  if (!res.ok) throw new Error("Error al cargar movimientos")
  return res.json()
}

async function createMovement(data: CreateStockMovementInput) {
  const res = await fetch("/api/stock-movements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "Error al registrar movimiento")
  }
  return res.json()
}

export function useStockMovements(filters: StockMovementFilters = {}) {
  return useQuery({
    queryKey: ["stock-movements", filters],
    queryFn: () => fetchMovements(filters),
  })
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: createMovement,
    onSuccess: () => {
      toast.success("Movimiento registrado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
