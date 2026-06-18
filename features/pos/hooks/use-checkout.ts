"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/db"
import { apiFetch } from "@/lib/api-client"
import type { CreateSaleInput } from "../schemas/sale-schema"

export function useCheckout() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { data: session } = useSession()

  return useMutation({
    mutationFn: async (data: CreateSaleInput) => {
      const localId = crypto.randomUUID()

      const result = await apiFetch<Record<string, unknown>>("/api/sales", {
        method: "POST",
        body: { ...data, localId },
        resource: "sale",
        entityId: null,
        mockResponse: (body, cid) => {
          const payload = body as CreateSaleInput
          return {
            id: cid,
            localId: cid,
            subtotal: payload.subtotal,
            tax: payload.tax,
            discount: payload.discount ?? 0,
            total: payload.total,
            paymentMethod: payload.paymentMethod,
            isSynced: false,
            items: payload.items.map((item) => ({
              product: { name: "" },
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
              weightInGrams: item.weightInGrams ?? null,
            })),
            createdAt: new Date().toISOString(),
            user: { name: session?.user?.name ?? "Offline" },
            customer: null,
            electronicInvoice: null,
          }
        },
      })

      if (!result.ok) {
        throw new Error(result.error || "Error al procesar venta")
      }

      if (result.queued) {
        await db.offlineSales.add({
          localId,
          data: JSON.stringify(data),
          status: "pending",
          createdAt: new Date().toISOString(),
        })
        return result.mock
      }

      return result.data
    },
    onSuccess: (sale: { isSynced?: boolean }) => {
      if (sale.isSynced !== false) {
        toast.success("Venta registrada exitosamente")
      } else {
        toast.success("Venta guardada localmente. Se sincronizará automáticamente.")
      }
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["sales"] })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}
