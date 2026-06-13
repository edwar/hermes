"use client"

import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { useOfflineCache } from "@/hooks/use-offline-cache"

async function fetchDashboard() {
  const res = await fetch("/api/dashboard")
  if (!res.ok) throw new Error("Error al cargar dashboard")
  return res.json()
}

export function useDashboard() {
  const { data: session } = useSession()
  const companyId = session?.user?.companyId
  const { cacheDashboard, getCachedDashboard } = useOfflineCache()

  return useQuery({
    queryKey: ["dashboard", companyId],
    queryFn: async () => {
      try {
        const data = await fetchDashboard()
        if (companyId) cacheDashboard(data, companyId)
        return data
      } catch (err) {
        if (companyId) {
          const cached = await getCachedDashboard(companyId)
          if (cached) return cached
        }
        throw err
      }
    },
    refetchInterval: 30_000,
    retry: 0,
  })
}
