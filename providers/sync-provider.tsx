"use client"

import { createContext, useContext, useEffect, type ReactNode } from "react"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { db } from "@/lib/db"

interface SyncContextValue {
  isOnline: boolean
  pendingCount: number
  syncNow: () => Promise<void>
}

const SyncContext = createContext<SyncContextValue>({
  isOnline: true,
  pendingCount: 0,
  syncNow: async () => {},
})

export function useSync() {
  return useContext(SyncContext)
}

async function processSyncQueue() {
  const pending = await db.offlineSales
    .where("status")
    .equals("pending")
    .toArray()

  for (const sale of pending) {
    try {
      const res = await fetch("/api/sales/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localId: sale.localId, data: sale.data }),
      })

      if (res.ok) {
        await db.offlineSales.update(sale.id!, { status: "synced" })
      } else {
        const err = await res.json()
        await db.offlineSales.update(sale.id!, { status: "failed", error: err.error ?? "Error" })
      }
    } catch {
      return
    }
  }
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const isOnline = useOnlineStatus()

  useEffect(() => {
    if (isOnline) {
      processSyncQueue()
    }
  }, [isOnline])

  async function syncNow() {
    if (navigator.onLine) {
      await processSyncQueue()
    }
  }

  return (
    <SyncContext.Provider value={{ isOnline, pendingCount: 0, syncNow }}>
      {children}
    </SyncContext.Provider>
  )
}
