"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/db"
import { apiFetch } from "@/lib/api-client"
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

export function useStockMovements(filters: StockMovementFilters = {}) {
  const { data: session } = useSession()
  const companyId = session?.user?.companyId

  return useQuery({
    queryKey: ["stock-movements", filters, companyId],
    queryFn: async () => {
      try {
        return await fetchMovements(filters)
      } catch {
        const cached = await db.cachedProducts
          .where("companyId")
          .equals(companyId ?? "")
          .toArray()
        return {
          movements: [],
          total: 0,
          products: cached.map((p) => ({
            id: p.id,
            name: p.name,
            stock: p.stock,
            minStock: p.minStock,
          })),
        }
      }
    },
    retry: 0,
  })
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async (data: CreateStockMovementInput) => {
      const result = await apiFetch<Record<string, unknown>>("/api/stock-movements", {
        method: "POST",
        body: data,
        resource: "stock-movements",
        entityId: data.productId,
      })
      if (!result.ok) throw new Error(result.error)
      return result.queued ? result.mock : result.data
    },
    onSuccess: (data) => {
      const queued = (data as { _queued?: boolean })._queued
      toast.success(queued ? "Movimiento encolado: se aplicará al reconectar" : "Movimiento registrado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
