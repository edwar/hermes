"use client"

import { useCallback } from "react"
import { db } from "@/lib/db"
import type {
  CachedProduct,
  CachedCustomer,
  CachedCategory,
  CachedDenomination,
} from "@/lib/db"

export function useOfflineCache() {
  const cacheProducts = useCallback(async (products: any[], companyId: string) => {
    const mapped: CachedProduct[] = products.map((p) => ({
      id: p.id,
      companyId,
      name: p.name,
      barcode: p.barcode ?? null,
      price: Number(p.purchasePrice) * (1 + (p.profitMargin ?? 0.3)),
      cost: Number(p.purchasePrice),
      stock: p.stock,
      minStock: p.minStock,
      categoryId: p.categoryId,
      categoryName: p.category?.name,
      imageUrl: p.imageUrl ?? null,
      isActive: p.isActive ?? true,
      updatedAt: new Date().toISOString(),
    }))
    await db.cachedProducts.bulkPut(mapped)
  }, [])

  const searchCachedProducts = useCallback(async (query: string, companyId: string) => {
    const q = query.toLowerCase()
    const all = await db.cachedProducts
      .where("companyId")
      .equals(companyId)
      .filter((p) => p.isActive)
      .toArray()
    if (!q) return all
    return all.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
    )
  }, [])

  const getCachedProductByBarcode = useCallback(async (barcode: string, companyId: string) => {
    return db.cachedProducts
      .where("companyId")
      .equals(companyId)
      .filter((p) => p.barcode?.toLowerCase() === barcode.toLowerCase())
      .first()
  }, [])

  const cacheCustomers = useCallback(async (customers: any[], companyId: string) => {
    const mapped: CachedCustomer[] = customers.map((c) => ({
      id: c.id,
      companyId,
      cedula: c.cedula ?? null,
      name: c.name,
      email: c.email ?? null,
      phone: c.phone ?? null,
      address: c.address ?? null,
      dv: c.dv ?? null,
      documentType: c.documentType ?? "13",
      data: JSON.stringify(c),
      updatedAt: new Date().toISOString(),
    }))
    await db.cachedCustomers.bulkPut(mapped)
  }, [])

  const searchCachedCustomers = useCallback(async (cedula: string, companyId: string) => {
    const q = cedula.trim().toLowerCase()
    if (!q) return null
    return db.cachedCustomers
      .where("companyId")
      .equals(companyId)
      .filter((c) => c.cedula?.toLowerCase() === q || c.name.toLowerCase().includes(q))
      .first()
  }, [])

  const cacheCategories = useCallback(async (categories: any[], companyId: string) => {
    const mapped: CachedCategory[] = categories.map((c) => ({
      id: c.id,
      companyId,
      name: c.name,
      description: c.description ?? null,
      updatedAt: new Date().toISOString(),
    }))
    await db.cachedCategories.bulkPut(mapped)
  }, [])

  const cacheDenominations = useCallback(async (denominations: any[], companyId: string) => {
    const mapped: CachedDenomination[] = denominations.map((d) => ({
      id: d.id,
      companyId,
      value: Number(d.value),
      label: d.label,
      sortOrder: d.sortOrder ?? 0,
      isActive: d.isActive ?? true,
      updatedAt: new Date().toISOString(),
    }))
    await db.cachedDenominations.bulkPut(mapped)
  }, [])

  const getCachedDenominations = useCallback(async (companyId: string) => {
    return db.cachedDenominations
      .where("companyId")
      .equals(companyId)
      .filter((d) => d.isActive)
      .sortBy("sortOrder")
  }, [])

  const cacheSales = useCallback(async (sales: any[], companyId: string) => {
    const mapped: import("@/lib/db").CachedSale[] = sales.map((s) => ({
      id: s.id,
      companyId,
      data: JSON.stringify(s),
      createdAt: s.createdAt,
    }))
    if (mapped.length > 0) {
      await db.cachedSales.bulkPut(mapped)
    }
  }, [])

  const getCachedSales = useCallback(async (companyId: string) => {
    return db.cachedSales
      .where("companyId")
      .equals(companyId)
      .reverse()
      .sortBy("createdAt")
  }, [])

  const cacheDashboard = useCallback(async (data: any, companyId: string) => {
    await db.cachedDashboard.put({
      companyId,
      data: JSON.stringify(data),
      updatedAt: new Date().toISOString(),
    })
  }, [])

  const getCachedDashboard = useCallback(async (companyId: string) => {
    const cached = await db.cachedDashboard
      .where("companyId")
      .equals(companyId)
      .first()
    if (!cached) return null
    return JSON.parse(cached.data)
  }, [])

  return {
    cacheProducts,
    searchCachedProducts,
    getCachedProductByBarcode,
    cacheCustomers,
    searchCachedCustomers,
    cacheCategories,
    cacheDenominations,
    getCachedDenominations,
    cacheSales,
    getCachedSales,
    cacheDashboard,
    getCachedDashboard,
  }
}
