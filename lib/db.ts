import Dexie, { type EntityTable } from "dexie"

interface OfflineSale {
  id?: number
  localId: string
  data: string
  status: "pending" | "synced" | "failed"
  createdAt: string
  error?: string
}

interface CachedProduct {
  id: string
  name: string
  barcode?: string | null
  price: number
  cost: number
  stock: number
  minStock: number
  categoryId: string
  categoryName?: string
  updatedAt: string
}

const db = new Dexie("HermesPOS") as Dexie & {
  offlineSales: EntityTable<OfflineSale, "id">
  cachedProducts: EntityTable<CachedProduct, "id">
}

db.version(1).stores({
  offlineSales: "++id, localId, status, createdAt",
  cachedProducts: "id, name, barcode, categoryId",
})

export type { OfflineSale, CachedProduct }
export { db }
