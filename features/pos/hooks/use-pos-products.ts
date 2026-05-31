"use client"

import { useQuery } from "@tanstack/react-query"

async function fetchPosProducts(search = "") {
  const params = new URLSearchParams({ pageSize: "50", page: "1" })
  if (search) params.set("search", search)
  const res = await fetch(`/api/products?${params}`)
  if (!res.ok) throw new Error("Error al cargar productos")
  return res.json()
}

export function usePosProducts(search = "") {
  return useQuery({
    queryKey: ["pos-products", search],
    queryFn: () => fetchPosProducts(search),
    staleTime: 60_000,
  })
}
