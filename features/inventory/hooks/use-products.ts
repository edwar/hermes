"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api-client"
import type { CreateProductInput, UpdateProductInput } from "../schemas/product-schema"

export interface ProductFilters {
  search?: string
  categoryId?: string
  page?: number
  pageSize?: number
  onlyLowStock?: boolean
}

async function fetchProducts(filters: ProductFilters) {
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)
  if (filters.categoryId) params.set("categoryId", filters.categoryId)
  if (filters.page) params.set("page", String(filters.page))
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize))
  if (filters.onlyLowStock) params.set("onlyLowStock", "true")

  const res = await fetch(`/api/products?${params}`)
  if (!res.ok) throw new Error("Error al cargar productos")
  return res.json()
}

async function fetchProduct(id: string) {
  const res = await fetch(`/api/products/${id}`)
  if (!res.ok) throw new Error("Error al cargar producto")
  return res.json()
}

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => fetchProducts(filters),
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => fetchProduct(id),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async (data: CreateProductInput) => {
      const result = await apiFetch<Record<string, unknown>>("/api/products", {
        method: "POST",
        body: data,
        resource: "products",
      })
      if (!result.ok) throw new Error(result.error)
      return result.queued ? result.mock : result.data
    },
    onSuccess: (data) => {
      const queued = (data as { _queued?: boolean })._queued
      toast.success(queued ? "Producto encolado: se creará al reconectar" : "Producto creado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al crear producto")
    },
  })
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async (data: UpdateProductInput) => {
      const result = await apiFetch<Record<string, unknown>>(`/api/products/${id}`, {
        method: "PUT",
        body: data,
        resource: "products",
        entityId: id,
      })
      if (!result.ok) throw new Error(result.error)
      return result.queued ? result.mock : result.data
    },
    onSuccess: (data) => {
      const queued = (data as { _queued?: boolean })._queued
      toast.success(queued ? "Cambios guardados: se sincronizarán al reconectar" : "Producto actualizado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al actualizar producto")
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async (productId: string) => {
      const result = await apiFetch<Record<string, unknown>>(`/api/products/${productId}`, {
        method: "DELETE",
        resource: "products",
        entityId: productId,
        mockResponse: (_body, cid) => ({ id: productId, clientId: cid, deleted: true }),
      })
      if (!result.ok) throw new Error(result.error)
      return result.queued ? result.mock : result.data
    },
    onSuccess: (data) => {
      const queued = (data as { _queued?: boolean })._queued
      toast.success(queued ? "Eliminación encolada: se aplicará al reconectar" : "Producto eliminado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al eliminar producto")
    },
  })
}
