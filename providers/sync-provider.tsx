"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { db } from "@/lib/db"
import { sileo } from "sileo"

interface SyncContextValue {
  isOnline: boolean
  pendingCount: number
  syncing: boolean
  syncNow: () => Promise<void>
}

const SyncContext = createContext<SyncContextValue>({
  isOnline: true,
  pendingCount: 0,
  syncing: false,
  syncNow: async () => {},
})

export function useSync() {
  return useContext(SyncContext)
}

const MAX_ATTEMPTS = 5
const BATCH_SIZE = 25

interface BatchResult {
  clientId: string
  ok: boolean
  status: number
  response: unknown
}

async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  const pending = await db.offlineMutations
    .where("status")
    .equals("pending")
    .sortBy("createdAt")

  let synced = 0
  let failed = 0

  const failedIds: number[] = []

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE)
    const items = batch.map((m) => ({
      clientId: m.clientId,
      method: m.method,
      url: m.url,
      body: m.body,
    }))

    let results: BatchResult[] = []
    try {
      const res = await fetch("/api/sync/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      })
      if (!res.ok) {
        throw new Error(`Batch endpoint returned ${res.status}`)
      }
      const json = (await res.json()) as { results?: BatchResult[] }
      results = json.results ?? []
    } catch {
      for (const m of batch) {
        const newAttempts = m.attempts + 1
        if (newAttempts >= MAX_ATTEMPTS) {
          await db.offlineMutations.update(m.id!, {
            status: "failed",
            lastError: "Máximo de reintentos alcanzado",
          })
          failed++
          failedIds.push(m.id!)
        } else {
          await db.offlineMutations.update(m.id!, {
            attempts: newAttempts,
            lastError: "Sin conexión",
          })
        }
      }
      continue
    }

    for (const m of batch) {
      const r = results.find((x) => x.clientId === m.clientId)
      if (!r) continue

      if (r.ok) {
        await db.offlineMutations.delete(m.id!)
        if (m.attempts === 0) synced++
      } else if (r.status >= 400 && r.status < 500 && r.status !== 408 && r.status !== 429) {
        const errMsg =
          (r.response as { error?: string | { message?: string } } | null)?.error ??
          `Error ${r.status}`
        const errorText = typeof errMsg === "string" ? errMsg : errMsg?.message ?? `Error ${r.status}`
        await db.offlineMutations.update(m.id!, {
          status: "failed",
          lastError: errorText,
        })
        failed++
        failedIds.push(m.id!)
      } else {
        const newAttempts = m.attempts + 1
        if (newAttempts >= MAX_ATTEMPTS) {
          await db.offlineMutations.update(m.id!, {
            status: "failed",
            lastError: "Máximo de reintentos alcanzado",
          })
          failed++
          failedIds.push(m.id!)
        } else {
          await db.offlineMutations.update(m.id!, {
            attempts: newAttempts,
            lastError: `Error ${r.status}`,
          })
        }
      }
    }
  }

  return { synced, failed }
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const isOnline = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const autoSyncedRef = useRef(false)

  const refreshPendingCount = useCallback(async () => {
    const count = await db.offlineMutations
      .where("status")
      .equals("pending")
      .count()
    setPendingCount(count)
  }, [])

  const runSync = useCallback(
    async (showToast: boolean) => {
      if (!navigator.onLine) return
      if (syncing) return
      setSyncing(true)
      try {
        const { synced } = await processSyncQueue()
        if (showToast && synced > 0) {
          sileo.success({ title: `${synced} operación(es) sincronizada(s)` })
        }
      } finally {
        await refreshPendingCount()
        setSyncing(false)
      }
    },
    [refreshPendingCount, syncing]
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const count = await db.offlineMutations.where("status").equals("pending").count()
      if (!cancelled) setPendingCount(count)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handleQueueUpdate() {
      refreshPendingCount()
    }
    window.addEventListener("hermes:queue-updated", handleQueueUpdate)
    return () => {
      window.removeEventListener("hermes:queue-updated", handleQueueUpdate)
    }
  }, [refreshPendingCount])

  useEffect(() => {
    if (isOnline && pendingCount > 0 && !autoSyncedRef.current && !syncing) {
      autoSyncedRef.current = true
      runSync(true).then(() => {
        refreshPendingCount()
      })
    } else if (!isOnline) {
      autoSyncedRef.current = false
    }
  }, [isOnline, pendingCount, syncing, runSync, refreshPendingCount])

  async function syncNow() {
    await runSync(true)
  }

  return (
    <SyncContext.Provider value={{ isOnline, pendingCount, syncing, syncNow }}>
      {children}
    </SyncContext.Provider>
  )
}
