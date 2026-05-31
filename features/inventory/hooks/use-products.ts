"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
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

async function createProduct(data: CreateProductInput) {
  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Error al crear producto")
  return res.json()
}

async function updateProduct(id: string, data: UpdateProductInput) {
  const res = await fetch(`/api/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Error al actualizar producto")
  return res.json()
}

async function deleteProduct(id: string) {
  const res = await fetch(`/api/products/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Error al eliminar producto")
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
    mutationFn: createProduct,
    onSuccess: () => {
      toast.success("Producto creado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
    onError: () => {
      toast.error("Error al crear producto")
    },
  })
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (data: UpdateProductInput) => updateProduct(id, data),
    onSuccess: () => {
      toast.success("Producto actualizado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
    onError: () => {
      toast.error("Error al actualizar producto")
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      toast.success("Producto eliminado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
    onError: () => {
      toast.error("Error al eliminar producto")
    },
  })
}
