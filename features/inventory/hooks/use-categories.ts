"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api-client"
import type { CreateCategoryInput } from "../schemas/category-schema"

async function fetchCategories() {
  const res = await fetch("/api/categories")
  if (!res.ok) throw new Error("Error al cargar categorías")
  return res.json()
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async (data: CreateCategoryInput) => {
      const result = await apiFetch<Record<string, unknown>>("/api/categories", {
        method: "POST",
        body: data,
        resource: "categories",
      })
      if (!result.ok) throw new Error(result.error)
      return result.queued ? result.mock : result.data
    },
    onSuccess: (data) => {
      const queued = (data as { _queued?: boolean })._queued
      if (queued) toast.success("Categoría encolada: se creará al reconectar")
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    },
    onError: (err: Error) => toast.error(err.message || "Error al crear categoría"),
  })
}
