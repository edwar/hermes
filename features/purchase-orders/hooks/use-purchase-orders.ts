"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api-client"
import type { CreatePurchaseOrderInput } from "../schemas/purchase-order-schema"

async function fetchPurchaseOrders(status?: string, page?: number, pageSize = 20) {
  const params = new URLSearchParams()
  if (status) params.set("status", status)
  if (page) params.set("page", String(page))
  params.set("pageSize", String(pageSize))

  const res = await fetch(`/api/purchase-orders?${params}`)
  if (!res.ok) throw new Error("Error al cargar pedidos")
  return res.json()
}

export function usePurchaseOrders(status?: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["purchase-orders", { status, page, pageSize }],
    queryFn: () => fetchPurchaseOrders(status, page, pageSize),
  })
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async (data: CreatePurchaseOrderInput) => {
      const result = await apiFetch<Record<string, unknown>>("/api/purchase-orders", {
        method: "POST",
        body: data,
        resource: "purchase-orders",
      })
      if (!result.ok) throw new Error(result.error)
      return result.queued ? result.mock : result.data
    },
    onSuccess: (data) => {
      const queued = (data as { _queued?: boolean })._queued
      toast.success(queued ? "Pedido encolado: se creará al reconectar" : "Pedido creado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
    },
    onError: (err: Error) => toast.error(err.message || "Error al crear pedido"),
  })
}

export function useReceivePurchaseOrder() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async ({ id, items }: { id: string; items: { productId: string; quantity: number; purchasePrice: number }[] }) => {
      const result = await apiFetch<Record<string, unknown>>("/api/purchase-orders/receive", {
        method: "POST",
        body: { id, items },
        resource: "purchase-orders",
        entityId: id,
      })
      if (!result.ok) throw new Error(result.error)
      return result.queued ? result.mock : result.data
    },
    onSuccess: (data) => {
      const queued = (data as { _queued?: boolean })._queued
      toast.success(queued ? "Recepción encolada: se aplicará al reconectar" : "Pedido recibido exitosamente. Stock actualizado.")
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
    onError: (err: Error) => toast.error(err.message || "Error al recibir pedido"),
  })
}
