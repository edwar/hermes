"use client"

import { useSync } from "@/providers/sync-provider"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, RefreshCw, Loader2 } from "lucide-react"

export function OnlineBadge() {
  const { isOnline, pendingCount, syncing, syncNow } = useSync()

  async function handleSync() {
    await syncNow()
  }

  if (!isOnline) {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 px-2.5 py-0.5 text-[11px] font-medium bg-warning/10 text-warning border-warning/30 cursor-pointer select-none"
        onClick={pendingCount > 0 ? handleSync : undefined}
      >
        <WifiOff className="size-3" />
        {syncing ? (
          <Loader2 className="size-3 animate-spin" />
        ) : pendingCount > 0 ? (
          <RefreshCw className="size-3" />
        ) : null}
        Sin conexión
        {pendingCount > 0 && (
          <span className="ml-0.5 font-bold">· {pendingCount}</span>
        )}
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className={`gap-1.5 px-2.5 py-0.5 text-[11px] font-medium cursor-pointer select-none ${
        pendingCount > 0
          ? "bg-warning/10 text-warning border-warning/30"
          : "bg-success/10 text-success border-success/30"
      }`}
      onClick={pendingCount > 0 ? handleSync : undefined}
    >
      {syncing ? (
        <Loader2 className="size-3 animate-spin" />
      ) : pendingCount > 0 ? (
        <RefreshCw className="size-3" />
      ) : (
        <Wifi className="size-3" />
      )}
      {pendingCount > 0 ? `${pendingCount} pendiente(s)` : "En línea"}
    </Badge>
  )
}
