import Dexie, { type EntityTable } from "dexie"
import { HTTP_METHOD } from "@/lib/constants"

interface OfflineSale {
  id?: number
  localId: string
  data: string // JSON.stringify del payload completo de la venta
  status: "pending" | "synced" | "failed"
  createdAt: string
  error?: string
}

interface CachedProduct {
  id: string
  companyId: string
  name: string
  barcode?: string | null
  price: number
  cost: number
  stock: number
  minStock: number
  categoryId: string
  categoryName?: string
  imageUrl?: string | null
  isActive: boolean
  updatedAt: string
}

interface CachedCustomer {
  id: string
  companyId: string
  cedula?: string | null
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  dv?: string | null
  documentType?: string
  data: string // JSON completo del cliente
  updatedAt: string
}

interface CachedCategory {
  id: string
  companyId: string
  name: string
  description?: string | null
  updatedAt: string
}

interface CachedDenomination {
  id: string
  companyId: string
  value: number
  label: string
  sortOrder: number
  isActive: boolean
  updatedAt: string
}

interface CachedSetting {
  id: string
  companyId: string
  key: string
  value: string
  updatedAt: string
}

interface OfflineCashSession {
  id?: number
  sessionId: string
  companyId: string
  data: string
  status: "active" | "closed" | "synced"
  updatedAt: string
}

interface CachedSale {
  id: string
  companyId: string
  data: string // JSON de la venta completa
  createdAt: string
}

interface CachedDashboard {
  id?: number
  companyId: string
  data: string // JSON del dashboard
  updatedAt: string
}

export type MutationStatus = "pending" | "synced" | "failed"

export interface OfflineMutation {
  id?: number
  clientId: string // UUID generado en cliente; el server lo usa como idempotency key
  method: typeof HTTP_METHOD.POST | typeof HTTP_METHOD.PUT | typeof HTTP_METHOD.PATCH | typeof HTTP_METHOD.DELETE
  url: string // ej: "/api/products", "/api/products/abc"
  body: string | null // JSON.stringify(body) o null
  resource: string // etiqueta legible: "products", "customers", "sale", etc.
  entityId?: string | null // id del recurso afectado si se conoce
  status: MutationStatus
  attempts: number
  lastError?: string
  createdAt: string
  syncedAt?: string
}

const db = new Dexie("HermesPOS") as Dexie & {
  offlineSales: EntityTable<OfflineSale, "id">
  cachedProducts: EntityTable<CachedProduct, "id">
  cachedCustomers: EntityTable<CachedCustomer, "id">
  cachedCategories: EntityTable<CachedCategory, "id">
  cachedDenominations: EntityTable<CachedDenomination, "id">
  cachedSettings: EntityTable<CachedSetting, "id">
  offlineSessions: EntityTable<OfflineCashSession, "id">
  cachedSales: EntityTable<CachedSale, "id">
  cachedDashboard: EntityTable<CachedDashboard, "id">
  offlineMutations: EntityTable<OfflineMutation, "id">
}

db.version(3).stores({
  offlineSales: "++id, localId, status, createdAt",
  cachedProducts: "id, companyId, name, barcode, categoryId",
  cachedCustomers: "++id, companyId, cedula, name",
  cachedCategories: "id, companyId, name",
  cachedDenominations: "id, companyId, isActive",
  cachedSettings: "id, companyId, key",
  offlineSessions: "++id, sessionId, companyId, status",
  cachedSales: "id, companyId, createdAt",
  cachedDashboard: "++id, companyId",
})

db.version(4).stores({
  offlineSales: "++id, localId, status, createdAt",
  cachedProducts: "id, companyId, name, barcode, categoryId",
  cachedCustomers: "++id, companyId, cedula, name",
  cachedCategories: "id, companyId, name",
  cachedDenominations: "id, companyId, isActive",
  cachedSettings: "id, companyId, key",
  offlineSessions: "++id, sessionId, companyId, status",
  cachedSales: "id, companyId, createdAt",
  cachedDashboard: "++id, companyId",
  offlineMutations: "++id, clientId, status, resource, createdAt",
})

export type {
  OfflineSale,
  CachedProduct,
  CachedCustomer,
  CachedCategory,
  CachedDenomination,
  CachedSetting,
  OfflineCashSession,
  CachedSale,
  CachedDashboard,
}
export { db }
