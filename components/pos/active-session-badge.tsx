"use client"

import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { formatCOP } from "@/lib/utils"
import { Wallet, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ActiveSessionBadgeProps {
  onClose: () => void
  compact?: boolean
}

async function fetchActiveSession() {
  const res = await fetch("/api/cash-sessions/active")
  if (!res.ok) throw new Error("Error al cargar sesión activa")
  return res.json()
}

export function ActiveSessionBadge({ onClose, compact = false }: ActiveSessionBadgeProps) {
  const { data: session, isLoading } = useQuery({
    queryKey: ["active-session"],
    queryFn: fetchActiveSession,
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Cargando...</span>
      </div>
    )
  }

  if (!session) return null

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClose}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 touch-target"
        aria-label="Cerrar sesión de caja"
      >
        <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
        <Wallet className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium font-mono tabular-nums">
          {formatCOP(Number(session.openingBalance))}
        </span>
      </button>
    )
  }

  return (
    <div
      className="flex shrink-0 items-center gap-4 rounded-lg border border-border bg-card py-1.5 pr-1.5 pl-3"
      title={`Abierta a las ${format(new Date(session.openedAt), "HH:mm", { locale: es })}`}
    >
      <div className="flex items-center gap-2.5">
        <span className="size-2 rounded-full bg-success" aria-hidden="true" />
        <div className="leading-tight">
          <p className="font-mono text-[10px] font-medium tracking-[0.08em] text-success uppercase">Caja abierta</p>
          <p className="text-xs whitespace-nowrap text-muted-foreground">
            {session.cashRegister.name} · Base{" "}
            <span className="font-mono">{formatCOP(Number(session.openingBalance))}</span>
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onClose}>
        Cerrar caja
      </Button>
    </div>
  )
}
