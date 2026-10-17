"use client"

import { useState, useEffect, useRef } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api-client"
import { formatCOP } from "@/lib/utils"
import { Loader2, Printer, Plus, Minus, CheckCircle, ArrowRight } from "lucide-react"
import { SessionReport } from "./session-report"
import { CashMovementForm } from "./cash-movement-form"
import { STOCK_MOVEMENT_TYPE } from "@/lib/constants"

interface CloseSessionDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  refreshKey?: number
  onSessionClosed?: () => void
}

async function fetchActiveSession() {
  const res = await fetch("/api/cash-sessions/active")
  if (!res.ok) {
    if (res.status === 401) return null
    throw new Error(`Error ${res.status}`)
  }
  return res.json()
}

async function fetchSessionSummary() {
  const res = await fetch("/api/cash-sessions/active/summary")
  if (!res.ok) {
    if (res.status === 401) return null
    throw new Error(`Error ${res.status}`)
  }
  return res.json()
}

type Step = "summary" | "confirm" | "report"

export function CloseSessionDialog({ open, onOpenChange, refreshKey = 0, onSessionClosed }: CloseSessionDialogProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [step, setStep] = useState<Step>("summary")
  const [closingBalance, setClosingBalance] = useState("")
  const [showMovementForm, setShowMovementForm] = useState(false)
  const [closedSessionData, setClosedSessionData] = useState<any>(null)
  const [localLoading, setLocalLoading] = useState(false)

  const { data: session, isLoading: queryLoading } = useQuery({
    queryKey: ["active-session", refreshKey],
    queryFn: fetchActiveSession,
    refetchOnMount: true,
    retry: 1,
  })

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ["session-summary", refreshKey],
    queryFn: fetchSessionSummary,
    refetchOnMount: true,
    enabled: false,
  })

  const isLoading = localLoading || queryLoading
  const prevOpenRef = useRef(false)
  const wasClosedRef = useRef(false)

useEffect(() => {
    if (open && !prevOpenRef.current) {
      queryClient.invalidateQueries({ queryKey: ["active-session"] })
      queryClient.invalidateQueries({ queryKey: ["session-summary"] })
      refetchSummary()
    }
    prevOpenRef.current = open
  }, [open, queryClient, refetchSummary])

  function handleViewSummary() {
    setLocalLoading(true)
    queryClient.invalidateQueries({ queryKey: ["active-session"] })
    refetchSummary().finally(() => setLocalLoading(false))
    setStep("summary")
  }

  const mutation = useMutation({
    mutationFn: async ({ id, closingBalance }: { id: string; closingBalance: number }) => {
      const result = await apiFetch<Record<string, unknown>>(`/api/cash-sessions/${id}/close`, {
        method: "PUT",
        body: { closingBalance },
        resource: "cash-sessions",
        entityId: id,
      })
      if (!result.ok) throw new Error(result.error || "Error al cerrar caja")
      return result.queued ? result.mock : result.data
    },
    onSuccess: (result) => {
      const queued = (result as { _queued?: boolean })._queued
      toast.success(queued ? "Cierre encolado: se sincronizará al reconectar" : "Caja cerrada exitosamente")
      queryClient.invalidateQueries({ queryKey: ["active-session"] })
      queryClient.invalidateQueries({ queryKey: ["cash-sessions"] })
      setClosedSessionData(result)
      setStep("report")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function handleOpenChange(v: boolean) {
    if (!v) {
      const shouldLogout = wasClosedRef.current
      wasClosedRef.current = false
      setStep("summary")
      setClosingBalance("")
      setClosedSessionData(null)
      onOpenChange(v)
      if (shouldLogout) {
        onSessionClosed?.()
      }
    }
  }

  function handleContinueToConfirm() {
    setStep("confirm")
  }

  function handleSubmit() {
    const amount = parseFloat(closingBalance)
    if (isNaN(amount) || amount < 0) {
      toast.error("Ingresa un monto válido")
      return
    }
    wasClosedRef.current = true
    mutation.mutate({ id: session.id, closingBalance: amount })
  }

  function handleMovementSuccess() {
    setShowMovementForm(false)
    refetchSummary()
  }

  const loadingContent = (
    <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  )

  if (showMovementForm && session) {
    return (
      <CashMovementForm
        open={showMovementForm}
        onOpenChange={setShowMovementForm}
        sessionId={session.id}
        onSuccess={handleMovementSuccess}
      />
    )
  }

  if (step === "report" && closedSessionData) {
    return (
      <SessionReport
        sessionId={closedSessionData.id}
        open={true}
        onOpenChange={(v) => {
          if (!v) {
            setStep("summary")
            setClosedSessionData(null)
            handleOpenChange(false)
          }
        }}
      />
    )
  }

  return (
    <Dialog open={open && step !== "report"} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "summary" ? "Resumen de sesión" : "Confirmar cierre"}
          </DialogTitle>
          <DialogDescription>
            {step === "summary"
              ? "Revisa el resumen del día antes de cerrar"
              : "Ingresa el efectivo contado para confirmar el cierre"}
          </DialogDescription>
        </DialogHeader>

        {isLoading || summaryLoading ? loadingContent : !session || !summary ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No hay sesión activa</p>
        ) : step === "summary" ? (
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Caja</span>
                <span className="font-medium">{summary.cashRegister.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cajero</span>
                <span className="font-medium">{summary.user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base inicial</span>
                <span className="font-mono tabular-nums">{formatCOP(summary.summary.openingBalance)}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Ventas por método</p>
              {Object.entries(summary.summary.totals).map(([method, data]: [string, any]) => {
                if (data.count === 0) return null
                const labels: Record<string, string> = { CASH: "Efectivo", CARD: "Tarjeta", TRANSFER: "Transferencia", CREDIT: "Crédito" }
                return (
                  <div key={method} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{labels[method] ?? method}</span>
                    <span className="font-mono tabular-nums">{formatCOP(data.total)} ({data.count})</span>
                  </div>
                )
              })}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total ventas</span>
                <span className="font-mono tabular-nums font-medium">{formatCOP(summary.summary.totalSales)}</span>
              </div>
              {summary.summary.returnsCount > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span className="text-muted-foreground">Devoluciones</span>
                  <span className="font-mono tabular-nums">-{formatCOP(summary.summary.totalReturns)}</span>
                </div>
              )}
            </div>

            {summary.movements.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Movimientos</p>
                  {summary.movements.map((m: any) => (
                    <div key={m.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {m.type === STOCK_MOVEMENT_TYPE.IN ? "Ingreso" : "Retiro"}: {m.reason}
                      </span>
                      <span className={`font-mono tabular-nums ${m.type === STOCK_MOVEMENT_TYPE.IN ? "text-success" : "text-destructive"}`}>
                        {m.type === STOCK_MOVEMENT_TYPE.IN ? "+" : "-"}{formatCOP(Number(m.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Separator />

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Efectivo esperado</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base + Ventas Efectivo - Devoluciones + Ingresos - Retiros</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Efectivo en caja</span>
                <span className="font-mono tabular-nums text-lg">{formatCOP(summary.summary.expectedCash)}</span>
              </div>
            </div>

            {summary.summary.movements.in > 0 || summary.summary.movements.out > 0 ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowMovementForm(true)}
                >
                  <Plus className="mr-1 size-4" /> Movimiento
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowMovementForm(true)}
                >
                  <Plus className="mr-1 size-4" /> Agregar ingreso/retiro
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Efectivo esperado</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Monto que deberías tener</span>
                <span className="font-mono tabular-nums text-xl font-bold">{formatCOP(summary.summary.expectedCash)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="closing">Efectivo contado en caja</Label>
              <CurrencyInput
                id="closing"
                value={closingBalance}
                onChange={setClosingBalance}
                placeholder="$ 0"
                disabled={mutation.isPending}
                className="h-12 text-lg"
              />
                  {closingBalance && (() => {
                    const diff = Number(closingBalance) - summary.summary.expectedCash
                    return (
                      <div className="flex justify-between text-sm pt-2">
                        <span className="text-muted-foreground">Diferencia</span>
                        <span className={`font-mono tabular-nums font-semibold ${
                          diff === 0 ? "text-success" : diff > 0 ? "text-warning" : "text-destructive"
                        }`}>
                          {formatCOP(diff)}
                        </span>
                      </div>
                    )
                  })()}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "summary" ? (
            <>
              <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleContinueToConfirm}>
                Continuar <ArrowRight className="ml-2 size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={handleViewSummary}>
                <ArrowRight className="mr-2 size-4 rotate-180" /> Volver
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={mutation.isPending || !closingBalance}
              >
                {mutation.isPending ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" /> Cerrando...</>
                ) : (
                  <><CheckCircle className="mr-2 size-4" /> Confirmar cierre</>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
