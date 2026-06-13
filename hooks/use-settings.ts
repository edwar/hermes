"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api-client"

export interface StoreSettings {
  id: string
  storeName: string
  address: string
  phone: string
  nit: string
  email: string
  currency: string
  receiptFooter: string
  taxRate: number
  logoUrl: string
  inviteExpiryHours: number
  updatedAt: string
}

async function fetchSettings(): Promise<StoreSettings> {
  const res = await fetch("/api/settings")
  if (!res.ok) throw new Error("Error al cargar configuración")
  return res.json()
}

export function useSettings() {
  const queryClient = useQueryClient()
  const toast = useToast()

  const query = useQuery({
    queryKey: ["store-settings"],
    queryFn: fetchSettings,
    staleTime: 1000 * 60 * 5,
  })

  const mutation = useMutation({
    mutationFn: async (data: Partial<StoreSettings>) => {
      const result = await apiFetch<Record<string, unknown>>("/api/settings", {
        method: "PUT",
        body: data,
        resource: "settings",
      })
      if (!result.ok) throw new Error(result.error)
      return result.queued ? result.mock : result.data
    },
    onSuccess: (data) => {
      const queued = (data as { _queued?: boolean })._queued
      toast.success(queued ? "Configuración encolada: se sincronizará al reconectar" : "Configuración guardada")
      queryClient.invalidateQueries({ queryKey: ["store-settings"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return {
    settings: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    updateSettings: mutation.mutate,
    isSaving: mutation.isPending,
  }
}
