"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { CreateCategoryInput } from "../schemas/category-schema"

async function fetchCategories() {
  const res = await fetch("/api/categories")
  if (!res.ok) throw new Error("Error al cargar categorías")
  return res.json()
}

async function createCategory(data: CreateCategoryInput) {
  const res = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Error al crear categoría")
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

  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    },
  })
}
