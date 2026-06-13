"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api-client"
import type { CreateSupplierInput, UpdateSupplierInput } from "../schemas/supplier-schema"

export interface SupplierFilters {
  search?: string
  includeInactive?: boolean
  page?: number
  pageSize?: number
}

async function fetchSuppliers(filters: SupplierFilters = {}) {
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)
  if (filters.includeInactive) params.set("includeInactive", "true")
  if (filters.page) params.set("page", String(filters.page))
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize))

  const res = await fetch(`/api/suppliers?${params}`)
  if (!res.ok) throw new Error("Error al cargar proveedores")
  return res.json()
}

export function useSuppliers(filters: SupplierFilters = {}) {
  return useQuery({
    queryKey: ["suppliers", filters],
    queryFn: () => fetchSuppliers(filters),
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async (data: CreateSupplierInput) => {
      const result = await apiFetch<Record<string, unknown>>("/api/suppliers", {
        method: "POST",
        body: data,
        resource: "suppliers",
      })
      if (!result.ok) throw new Error(result.error)
      return result.queued ? result.mock : result.data
    },
    onSuccess: (data) => {
      const queued = (data as { _queued?: boolean })._queued
      toast.success(queued ? "Proveedor encolado: se creará al reconectar" : "Proveedor creado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
    },
    onError: (err: Error) => toast.error(err.message || "Error al crear proveedor"),
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async (data: UpdateSupplierInput) => {
      const result = await apiFetch<Record<string, unknown>>("/api/suppliers", {
        method: "PUT",
        body: data,
        resource: "suppliers",
        entityId: data.id,
      })
      if (!result.ok) throw new Error(result.error)
      return result.queued ? result.mock : result.data
    },
    onSuccess: (data) => {
      const queued = (data as { _queued?: boolean })._queued
      toast.success(queued ? "Cambios guardados: se sincronizarán al reconectar" : "Proveedor actualizado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
    },
    onError: (err: Error) => toast.error(err.message || "Error al actualizar proveedor"),
  })
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await apiFetch<Record<string, unknown>>(`/api/suppliers?id=${id}`, {
        method: "DELETE",
        resource: "suppliers",
        entityId: id,
        mockResponse: (_body, cid) => ({ id, clientId: cid, deleted: true }),
      })
      if (!result.ok) throw new Error(result.error)
      return result.queued ? result.mock : result.data
    },
    onSuccess: (data) => {
      const queued = (data as { _queued?: boolean })._queued
      toast.success(queued ? "Eliminación encolada: se aplicará al reconectar" : "Proveedor eliminado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
    },
    onError: (err: Error) => toast.error(err.message || "Error al eliminar proveedor"),
  })
}
