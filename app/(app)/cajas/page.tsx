"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useCanSee } from "@/components/shared/allowed-modules"
import { CashRegistersList } from "@/components/cajas/cash-registers-list"
import { SessionsList } from "@/components/cajas/sessions-list"
import { OpenSessionDialog } from "@/components/cajas/open-session-dialog"
import { CloseSessionDialog } from "@/components/cajas/close-session-dialog"
import { CashMovementForm } from "@/components/cajas/cash-movement-form"
import { Button } from "@/components/ui/button"
import { formatCOP } from "@/lib/utils"
import { Wallet, Plus, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

async function fetchActiveSession() {
  const res = await fetch("/api/cash-sessions/active")
  if (!res.ok) throw new Error("Error al cargar sesión activa")
  return res.json()
}

export default function CajasPage() {
  // Administrar las cajas registradoras depende del módulo Cajas, no de un rol fijo.
  const canManageRegisters = useCanSee()("/cajas")
  const [openDialog, setOpenDialog] = useState(false)
  const [closeDialog, setCloseDialog] = useState(false)
  const [movementDialog, setMovementDialog] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const { data: activeSession, isLoading } = useQuery({
    queryKey: ["active-session", refreshKey],
    queryFn: fetchActiveSession,
  })

  function handleSessionChange() {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cajas</h1>
          <p className="text-sm text-muted-foreground">Gestión de cajas registradoras y sesiones</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
      ) : activeSession ? (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                <Wallet className="size-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Sesión activa</h2>
                <p className="text-sm text-muted-foreground">
                  {activeSession.cashRegister.name} · {activeSession.user.name}
                </p>
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Base: </span>
                    <span className="font-mono tabular-nums font-medium">{formatCOP(Number(activeSession.openingBalance))}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Abierta: </span>
                    <span>{format(new Date(activeSession.openedAt), "dd/MM HH:mm", { locale: es })}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ventas: </span>
                    <span className="font-mono tabular-nums">{activeSession._count.sales}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setMovementDialog(true)}>
                <Plus className="mr-1.5 size-4" /> Movimiento
              </Button>
              <Button size="sm" onClick={() => setCloseDialog(true)}>
                Cerrar Caja
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-muted">
              <Wallet className="size-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">No hay sesión activa</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Abre una caja registradora para iniciar la jornada
            </p>
            <Button onClick={() => setOpenDialog(true)}>
              <Wallet className="mr-2 size-4" /> Abrir Caja
            </Button>
          </div>
        </div>
      )}

      <SessionsList refreshKey={refreshKey} />

      {canManageRegisters && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <CashRegistersList />
        </div>
      )}

      <OpenSessionDialog open={openDialog} onOpenChange={setOpenDialog} onSuccess={handleSessionChange} />
      <CloseSessionDialog open={closeDialog} onOpenChange={(v) => { setCloseDialog(v); if (!v) handleSessionChange() }} refreshKey={refreshKey} />
      {activeSession && (
        <CashMovementForm
          open={movementDialog}
          onOpenChange={setMovementDialog}
          sessionId={activeSession.id}
          onSuccess={handleSessionChange}
        />
      )}
    </div>
  )
}
