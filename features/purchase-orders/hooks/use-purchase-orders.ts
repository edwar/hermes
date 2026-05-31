"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
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

async function createPurchaseOrder(data: CreatePurchaseOrderInput) {
  const res = await fetch("/api/purchase-orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Error al crear pedido")
  return res.json()
}

async function receivePurchaseOrder(id: string, items: { productId: string; quantity: number; purchasePrice: number }[]) {
  const res = await fetch("/api/purchase-orders/receive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, items }),
  })
  if (!res.ok) throw new Error("Error al recibir pedido")
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
    mutationFn: createPurchaseOrder,
    onSuccess: () => {
      toast.success("Pedido creado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
    },
    onError: () => {
      toast.error("Error al crear pedido")
    },
  })
}

export function useReceivePurchaseOrder() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: ({ id, items }: { id: string; items: { productId: string; quantity: number; purchasePrice: number }[] }) =>
      receivePurchaseOrder(id, items),
    onSuccess: () => {
      toast.success("Pedido recibido exitosamente. Stock actualizado.")
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
    onError: () => {
      toast.error("Error al recibir pedido")
    },
  })
}
