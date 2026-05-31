"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
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

async function createSupplier(data: CreateSupplierInput) {
  const res = await fetch("/api/suppliers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Error desconocido" }))
    throw new Error(error.error || "Error al crear proveedor")
  }
  return res.json()
}

async function updateSupplier(data: UpdateSupplierInput) {
  const res = await fetch("/api/suppliers", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Error desconocido" }))
    throw new Error(error.error || "Error al actualizar proveedor")
  }
  return res.json()
}

async function deleteSupplier(id: string) {
  const res = await fetch(`/api/suppliers?id=${id}`, { method: "DELETE" })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Error desconocido" }))
    throw new Error(error.error || "Error al eliminar proveedor")
  }
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
    mutationFn: createSupplier,
    onSuccess: () => {
      toast.success("Proveedor creado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
    },
    onError: () => {
      toast.error("Error al crear proveedor")
    },
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: updateSupplier,
    onSuccess: () => {
      toast.success("Proveedor actualizado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
    },
    onError: () => {
      toast.error("Error al actualizar proveedor")
    },
  })
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      toast.success("Proveedor eliminado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
    },
    onError: () => {
      toast.error("Error al eliminar proveedor")
    },
  })
}
