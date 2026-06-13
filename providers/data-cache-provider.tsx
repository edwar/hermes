"use client"

import { useEffect, type ReactNode } from "react"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { useOfflineCache } from "@/hooks/use-offline-cache"

async function fetchAll(url: string) {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

function DataCacheInner({ companyId }: { companyId: string }) {
  const { cacheProducts, cacheCustomers, cacheCategories, cacheDenominations } = useOfflineCache()

  const { data: products } = useQuery({
    queryKey: ["cache-products", companyId],
    queryFn: () => fetchAll(`/api/products?pageSize=500&page=1`),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: customers } = useQuery({
    queryKey: ["cache-customers", companyId],
    queryFn: () => fetchAll(`/api/customers?pageSize=500&page=1`),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: categories } = useQuery({
    queryKey: ["cache-categories", companyId],
    queryFn: () => fetchAll("/api/categories"),
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000,
  })

  const { data: denominations } = useQuery({
    queryKey: ["cache-denominations", companyId],
    queryFn: () => fetchAll("/api/cash-denominations"),
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000,
  })

  useEffect(() => {
    if (products?.products) cacheProducts(products.products, companyId)
  }, [products, cacheProducts, companyId])

  useEffect(() => {
    if (customers?.customers) cacheCustomers(customers.customers, companyId)
  }, [customers, cacheCustomers, companyId])

  useEffect(() => {
    if (Array.isArray(categories)) cacheCategories(categories, companyId)
    else if (categories?.data) cacheCategories(categories.data, companyId)
  }, [categories, cacheCategories, companyId])

  useEffect(() => {
    if (Array.isArray(denominations)) cacheDenominations(denominations, companyId)
  }, [denominations, cacheDenominations, companyId])

  return null
}

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const companyId = session?.user?.companyId

  return (
    <>
      {companyId && <DataCacheInner companyId={companyId} />}
      {children}
    </>
  )
}
