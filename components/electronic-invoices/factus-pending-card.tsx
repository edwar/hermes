"use client"

import { Fragment, useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { sileo } from "sileo"
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Trash2,
  Zap,
  WifiOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface PendingBill {
  id?: number | string
  number?: string
  reference_code?: string
  status?: string
  is_validated?: boolean
  created_at?: string
  customer?: { names?: string; identification?: string }
  total?: string | number
}

interface DiagnoseResponse {
  company?: {
    name: string
    factusEnabled: boolean
    tokenExpiresAt: string | null
    tokenValid: boolean
  } | null
  pendingBills: PendingBill[]
  pendingBillsError: string | null
  pendingCreditNotes: PendingBill[]
  pendingCreditNotesError: string | null
  pendingBillsRestricted?: boolean
}

export function FactusPendingCard() {
  const { data: session } = useSession()
  const role = session?.user?.role
  const canManage = role === "GOD" || role === "ADMIN"

  const [data, setData] = useState<DiagnoseResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState<PendingBill | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [rowErrors, setRowErrors] = useState<Record<string, { message: string; isDianConflict: boolean }>>({})

  const fetchDiagnose = useCallback(async () => {
    try {
      const res = await fetch("/api/factus/diagnose-pending")
      if (res.ok) {
        const json = (await res.json()) as DiagnoseResponse
        setData(json)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchDiagnose()
  }, [fetchDiagnose])

  function describeFactusError(message: string): { isDianConflict: boolean; tip: string } {
    if (!message) return { isDianConflict: false, tip: "" }
    const lower = message.toLowerCase()
    if (lower.includes("dian") || lower.includes("ya fue enviado")) {
      return {
        isDianConflict: true,
        tip: "La factura ya fue procesada por la DIAN pero la API de Factus aún la lista como pendiente. Es una inconsistencia que se auto-resuelve. Vuelve a consultar la cola en unos minutos; si ya está vacía, podrás reintentar las ventas.",
      }
    }
    if (lower.includes("no se encontró") || lower.includes("no encontrado") || lower.includes("404")) {
      return {
        isDianConflict: false,
        tip: "Factus no encontró esta factura en su cola. Ya está limpia. Vuelve a consultar la cola.",
      }
    }
    return { isDianConflict: false, tip: "" }
  }

  async function handleClear(bill: PendingBill) {
    if (!bill.reference_code) return
    setClearing(bill.reference_code)
    try {
      const res = await fetch("/api/factus/pending-bills", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceCode: bill.reference_code }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        sileo.success({
          title: json.alreadyCleared
            ? "Ya estaba limpia en Factus"
            : "Factura eliminada de la cola de Factus",
        })
        setRowErrors((prev) => {
          const next = { ...prev }
          delete next[bill.reference_code!]
          return next
        })
        await fetchDiagnose()
      } else {
        const factusMessage = json.error || "No se pudo limpiar"
        const { isDianConflict, tip } = describeFactusError(factusMessage)
        setRowErrors((prev) => ({
          ...prev,
          [bill.reference_code!]: { message: factusMessage, isDianConflict },
        }))
        sileo.error({
          title: isDianConflict ? "Factus: ya procesada por la DIAN" : "No se pudo limpiar",
          description: factusMessage,
        })
        if (tip) {
          // surface the tip on next render via a lightweight info bar below the row
        }
      }
    } catch {
      sileo.error({ title: "Error de conexión al limpiar" })
    } finally {
      setClearing(null)
      setConfirmClear(null)
    }
  }

  const bills = data?.pendingBills ?? []
  const billsError = data?.pendingBillsError
  const creditNotes = data?.pendingCreditNotes ?? []
  const creditNotesError = data?.pendingCreditNotesError
  const tokenValid = data?.company?.tokenValid ?? false
  const factusEnabled = data?.company?.factusEnabled ?? false
  const pendingBillsRestricted = data?.pendingBillsRestricted ?? false

  const totalPending = bills.length + creditNotes.length
  const hasError = !!billsError || !!creditNotesError

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Consultando estado de la cola de Factus...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="size-4 text-primary" />
            Cola de pendientes en Factus
            {!loading && totalPending > 0 && (
              <Badge variant="destructive" className="ml-1">
                {totalPending}
              </Badge>
            )}
            {!loading && totalPending === 0 && !hasError && factusEnabled && tokenValid && !pendingBillsRestricted && (
              <Badge variant="default" className="ml-1 bg-green-600">
                Limpia
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {totalPending > 0 && canManage && bills.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpanded((e) => !e)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="mr-1 size-4" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1 size-4" />
                    Ver {bills.length} {bills.length === 1 ? "bloqueada" : "bloqueadas"}
                  </>
                )}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={fetchDiagnose}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              <span className="ml-1.5 hidden sm:inline">Actualizar</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!factusEnabled && !pendingBillsRestricted && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-600">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">Facturación electrónica no habilitada</p>
              <p className="text-xs text-amber-600/80">
                Activa el switch en Configuración para poder emitir FE.
              </p>
            </div>
          </div>
        )}

        {pendingBillsRestricted && factusEnabled && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-600">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">Facturación electrónica habilitada</p>
              <p className="text-xs text-blue-600/80">
                Solo administradores pueden ver la cola de pendientes de Factus. Si hay problemas al emitir FE, contacta al administrador.
              </p>
            </div>
          </div>
        )}

        {factusEnabled && !tokenValid && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-600">
            <WifiOff className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">Token de Factus expirado</p>
              <p className="text-xs text-amber-600/80">
                Reconecta el switch en Configuración para renovar el token.
              </p>
              <Link
                href="/settings"
                className="mt-2 inline-flex h-7 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-muted touch-target"
              >
                Ir a Configuración
              </Link>
            </div>
          </div>
        )}

        {hasError && factusEnabled && tokenValid && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">No se pudo consultar Factus</p>
              <p className="text-xs text-red-600/80">
                {billsError || creditNotesError}
              </p>
            </div>
          </div>
        )}

        {!hasError && totalPending === 0 && factusEnabled && tokenValid && !pendingBillsRestricted && (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-600">
            <CheckCircle2 className="size-4" />
            Sin facturas pendientes en Factus. Las nuevas ventas deberían validarse correctamente.
          </div>
        )}

        {expanded && bills.length > 0 && (
          <div className="rounded-lg border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Número</th>
                    <th className="px-3 py-2 text-left font-medium">Ref Code</th>
                    <th className="hidden md:table-cell px-3 py-2 text-left font-medium">Cliente</th>
                    <th className="hidden md:table-cell px-3 py-2 text-left font-medium">Creada</th>
                    {canManage && (
                      <th className="px-3 py-2 text-right font-medium">Acción</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bills.map((bill) => {
                    const rowKey = bill.reference_code ?? bill.number ?? String(bill.id)
                    const rowError = rowErrors[rowKey]
                    const errorInfo = rowError ? describeFactusError(rowError.message) : null
                    return (
                      <Fragment key={rowKey}>
                        <tr className={rowError ? "bg-destructive/5" : undefined}>
                          <td className="px-3 py-2 font-mono text-xs">{bill.number ?? "—"}</td>
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                            {bill.reference_code ?? "—"}
                          </td>
                          <td className="hidden md:table-cell px-3 py-2 text-sm">
                            {bill.customer?.names ?? "—"}
                          </td>
                          <td className="hidden md:table-cell px-3 py-2 text-xs text-muted-foreground">
                            {bill.created_at
                              ? format(new Date(bill.created_at), "dd/MM/yy HH:mm", { locale: es })
                              : "—"}
                          </td>
                          {canManage && (
                            <td className="px-3 py-2 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!bill.reference_code || clearing === bill.reference_code}
                                onClick={() => setConfirmClear(bill)}
                                className="text-destructive hover:bg-destructive/10 touch-target"
                                aria-label={`Limpiar ${bill.number ?? bill.reference_code}`}
                              >
                                {clearing === bill.reference_code ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="size-3.5" />
                                )}
                                <span className="ml-1.5 hidden sm:inline">Limpiar</span>
                              </Button>
                            </td>
                          )}
                        </tr>
                        {rowError && (
                          <tr className="bg-destructive/5">
                            <td colSpan={canManage ? 5 : 4} className="px-3 pb-3 pt-0">
                              <div
                                className={
                                  "mt-1 flex flex-col gap-1 rounded-lg border p-2.5 text-xs " +
                                  (errorInfo?.isDianConflict
                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                    : "border-destructive/30 bg-destructive/10 text-destructive")
                                }
                                role="alert"
                              >
                                <div className="flex items-center gap-1.5 font-medium">
                                  <AlertCircle className="size-3.5 shrink-0" />
                                  {errorInfo?.isDianConflict
                                    ? "Factus dice que ya fue procesada por la DIAN"
                                    : "Factus no pudo limpiar esta factura"}
                                </div>
                                <p className="text-xs opacity-90">{rowError.message}</p>
                                {errorInfo?.tip && (
                                  <p className="text-xs opacity-90">{errorInfo.tip}</p>
                                )}
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={fetchDiagnose}
                                    className="h-6 px-2 text-xs"
                                  >
                                    <RefreshCw className="mr-1 size-3" />
                                    Actualizar cola
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setConfirmClear(bill)}
                                    disabled={!bill.reference_code || clearing === bill.reference_code}
                                    className="h-6 px-2 text-xs"
                                  >
                                    Reintentar limpieza
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {creditNotes.length > 0 && (
              <div className="border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                {creditNotes.length} {creditNotes.length === 1 ? "nota crédito pendiente" : "notas crédito pendientes"} (no se muestran — contactar soporte de Factus)
              </div>
            )}
          </div>
        )}

        {totalPending > 0 && !expanded && (
          <p className="text-xs text-muted-foreground">
            Estas facturas pendientes en Factus están bloqueando la emisión de nuevas facturas electrónicas.
            {canManage && " Un ADMIN/GOD puede limpiarlas desde el botón superior."}
          </p>
        )}
      </CardContent>

      <AlertDialog
        open={!!confirmClear}
        onOpenChange={(v) => { if (!v) setConfirmClear(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpiar factura pendiente de Factus</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a llamar a <code className="rounded bg-muted px-1 py-0.5 text-xs">DELETE /v2/bills/destroy/reference/{confirmClear?.reference_code}</code> en Factus.
              <br />
              <br />
              Esto solo funciona si la factura NO ha sido validada por la DIAN. Si ya fue validada, Factus devolverá un error.
              <br />
              <br />
              <strong>Factura a limpiar:</strong>{" "}
              <span className="font-mono">{confirmClear?.number ?? confirmClear?.reference_code}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
              onClick={() => confirmClear && handleClear(confirmClear)}
            >
              Limpiar de Factus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
