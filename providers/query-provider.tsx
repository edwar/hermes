"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { persistQueryClient } from "@tanstack/react-query-persist-client"
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import { useState, useEffect, type ReactNode } from "react"

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 24 * 60 * 60 * 1000,
            retry: 1,
          },
        },
      })
  )

  useEffect(() => {
    if (typeof window === "undefined") return

    const persister = createSyncStoragePersister({
      storage: window.localStorage,
      key: "HERMES_QUERY_CACHE",
      throttleTime: 1000,
    })

    persistQueryClient({
      queryClient,
      persister,
      maxAge: 24 * 60 * 60 * 1000,
      buster: "v1",
    })
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
