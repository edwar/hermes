"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"

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

async function updateSettings(data: Partial<StoreSettings>) {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "Error al guardar configuración")
  }
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
    mutationFn: updateSettings,
    onSuccess: () => {
      toast.success("Configuración guardada")
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
