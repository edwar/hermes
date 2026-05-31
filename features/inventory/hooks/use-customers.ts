"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
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

async function createCustomer(data: CreateCustomerInput) {
  const res = await fetch("/api/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Error al crear cliente")
  return res.json()
}

async function updateCustomer(data: UpdateCustomerInput) {
  const res = await fetch("/api/customers", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Error al actualizar cliente")
  return res.json()
}

async function deleteCustomer(id: string) {
  const res = await fetch(`/api/customers?id=${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Error al eliminar cliente")
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
    mutationFn: createCustomer,
    onSuccess: () => {
      toast.success("Cliente creado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
    onError: () => toast.error("Error al crear cliente"),
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: updateCustomer,
    onSuccess: () => {
      toast.success("Cliente actualizado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
    onError: () => toast.error("Error al actualizar cliente"),
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      toast.success("Cliente eliminado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
    onError: () => toast.error("Error al eliminar cliente"),
  })
}
