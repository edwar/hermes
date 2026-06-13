"use client"

import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { useOfflineCache } from "@/hooks/use-offline-cache"

async function fetchPosProducts(search = "") {
  const params = new URLSearchParams({ pageSize: "50", page: "1" })
  if (search) params.set("search", search)
  const res = await fetch(`/api/products?${params}`)
  if (!res.ok) throw new Error("Error al cargar productos")
  return res.json()
}

export function usePosProducts(search = "") {
  const { data: session } = useSession()
  const companyId = session?.user?.companyId
  const { searchCachedProducts, cacheProducts } = useOfflineCache()

  return useQuery({
    queryKey: ["pos-products", search, companyId],
    queryFn: async () => {
      try {
        const data = await fetchPosProducts(search)
        if (companyId && data.products) {
          cacheProducts(data.products, companyId)
        }
        return data
      } catch (err) {
        if (companyId) {
          const cached = await searchCachedProducts(search, companyId)
          return {
            products: cached.map((p) => ({
              id: p.id,
              name: p.name,
              barcode: p.barcode,
              purchasePrice: p.cost,
              profitMargin: 0.3,
              stock: p.stock,
              minStock: p.minStock,
              categoryId: p.categoryId,
              imageUrl: p.imageUrl,
              isActive: p.isActive,
              category: { name: p.categoryName },
            })),
            total: cached.length,
            page: 1,
            pages: 1,
          }
        }
        throw err
      }
    },
    staleTime: 60_000,
    retry: 0,
  })
}
