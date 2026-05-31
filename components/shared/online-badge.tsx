"use client"

import { useSync } from "@/providers/sync-provider"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff } from "lucide-react"

export function OnlineBadge() {
  const { isOnline } = useSync()

  return (
    <Badge
      variant="outline"
      className={`gap-1.5 px-2.5 py-0.5 text-[11px] font-medium border-[oklch(0.88_0.01_50)] ${
        isOnline
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900"
          : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900"
      }`}
    >
      {isOnline ? (
        <Wifi className="size-3" />
      ) : (
        <WifiOff className="size-3" />
      )}
      {isOnline ? "En línea" : "Sin conexión"}
    </Badge>
  )
}
