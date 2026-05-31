"use client"

import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { formatCOP } from "@/lib/utils"
import { Wallet, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ActiveSessionBadgeProps {
  onClose: () => void
}

async function fetchActiveSession() {
  const res = await fetch("/api/cash-sessions/active")
  if (!res.ok) throw new Error("Error al cargar sesión activa")
  return res.json()
}

export function ActiveSessionBadge({ onClose }: ActiveSessionBadgeProps) {
  const { data: session, isLoading } = useQuery({
    queryKey: ["active-session"],
    queryFn: fetchActiveSession,
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Cargando...</span>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-1.5 shadow-sm">
      <Wallet className="size-4 text-primary" />
      <div className="text-xs leading-tight">
        <p className="font-medium">{session.cashRegister.name}</p>
        <p className="text-muted-foreground">
          Base: {formatCOP(Number(session.openingBalance))} · {format(new Date(session.openedAt), "HH:mm", { locale: es })}
        </p>
      </div>
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClose}>
        Cerrar
      </Button>
    </div>
  )
}
