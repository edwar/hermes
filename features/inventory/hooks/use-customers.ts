"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api-client"
import type { CreateCustomerInput, UpdateCustomerInput } from "../schemas/customer-schema"

export interface CustomerFilters {
  search?: string
  page?: number
  pageSize?: number
}

async function fetchCustomers(filters: CustomerFilters = {}) {
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)
  if (filters.page) params.set("page", String(filters.page))
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize))

  const res = await fetch(`/api/customers?${params}`)
  if (!res.ok) throw new Error("Error al cargar clientes")
  return res.json()
}

export function useCustomers(filters: CustomerFilters = {}) {
  return useQuery({
    queryKey: ["customers", filters],
    queryFn: () => fetchCustomers(filters),
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async (data: CreateCustomerInput) => {
      const result = await apiFetch<Record<string, unknown>>("/api/customers", {
        method: "POST",
        body: data,
        resource: "customers",
      })
      if (!result.ok) throw new Error(result.error)
      return result.queued ? result.mock : result.data
    },
    onSuccess: (data) => {
      const queued = (data as { _queued?: boolean })._queued
      toast.success(queued ? "Cliente encolado: se creará al reconectar" : "Cliente creado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
    onError: (err: Error) => toast.error(err.message || "Error al crear cliente"),
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async (data: UpdateCustomerInput) => {
      const result = await apiFetch<Record<string, unknown>>("/api/customers", {
        method: "PUT",
        body: data,
        resource: "customers",
        entityId: data.id,
      })
      if (!result.ok) throw new Error(result.error)
      return result.queued ? result.mock : result.data
    },
    onSuccess: (data) => {
      const queued = (data as { _queued?: boolean })._queued
      toast.success(queued ? "Cambios guardados: se sincronizarán al reconectar" : "Cliente actualizado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
    onError: (err: Error) => toast.error(err.message || "Error al actualizar cliente"),
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await apiFetch<Record<string, unknown>>(`/api/customers?id=${id}`, {
        method: "DELETE",
        resource: "customers",
        entityId: id,
        mockResponse: (_body, cid) => ({ id, clientId: cid, deleted: true }),
      })
      if (!result.ok) throw new Error(result.error)
      return result.queued ? result.mock : result.data
    },
    onSuccess: (data) => {
      const queued = (data as { _queued?: boolean })._queued
      toast.success(queued ? "Eliminación encolada: se aplicará al reconectar" : "Cliente eliminado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
    onError: (err: Error) => toast.error(err.message || "Error al eliminar cliente"),
  })
}
