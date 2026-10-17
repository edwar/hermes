"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatCOP } from "@/lib/utils"
import { Loader2, Printer } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { STOCK_MOVEMENT_TYPE } from "@/lib/constants"


interface SessionReportProps {
  sessionId: string
  open: boolean
  onOpenChange: (v: boolean) => void
}

async function fetchReport(id: string) {
  const res = await fetch(`/api/cash-sessions/${id}/report`)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Error al cargar reporte" }))
    throw new Error(error.message || "Error al cargar reporte")
  }
  return res.json()
}

export function SessionReport({ sessionId, open, onOpenChange }: SessionReportProps) {
  const [isPrinting, setIsPrinting] = useState(false)
  const hasPrintedRef = useRef(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["session-report", sessionId],
    queryFn: () => fetchReport(sessionId),
    enabled: open,
    retry: 2,
    refetchOnMount: true,
  })

  useEffect(() => {
    hasPrintedRef.current = false
  }, [sessionId])

  useEffect(() => {
    if (data && data.session && !hasPrintedRef.current) {
      hasPrintedRef.current = true
      const timer = setTimeout(() => {
        window.print()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [data])

  if (!open) return null

  const session = data?.session
  const summary = data?.summary
  const salesByMethod = data?.salesByMethod
  const returns = data?.returns
  const hasError = isError || data?.error || !session || !summary

  function handlePrint() {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 100)
  }

  const loadingContent = (
    <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
  )

  const errorContent = (
    <div className="py-8 text-center">
      <p className="text-sm text-muted-foreground">No se pudo cargar el reporte</p>
      <p className="text-xs text-muted-foreground mt-1">Intenta cerrar el diálogo y abrirlo de nuevo</p>
    </div>
  )

  const reportContent = session && summary ? (
    <div id="session-report-content" className="space-y-4 print-area">
      <div className="text-center">
        <h3 className="text-lg font-bold">CIERRE DE CAJA</h3>
        <p className="text-xs text-muted-foreground">{session.cashRegister.name}</p>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Cajero</span><span>{session.user.name}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Apertura</span><span>{format(new Date(session.openedAt), "dd/MM/yyyy HH:mm", { locale: es })}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Cierre</span><span>{session.closedAt ? format(new Date(session.closedAt), "dd/MM/yyyy HH:mm", { locale: es }) : "-"}</span></div>
      </div>

      <Separator />

      <div className="space-y-1 text-sm font-medium">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Resumen de ventas</p>
        <div className="flex justify-between"><span className="text-muted-foreground">Total ventas</span><span className="font-mono tabular-nums">{formatCOP(Number(summary.totalSales))}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Cantidad ventas</span><span className="font-mono tabular-nums">{summary.salesCount}</span></div>
        {Object.entries(salesByMethod ?? {}).map(([method, sales]: [string, unknown]) => {
          const salesArr = sales as Array<{ total: number }>
          if (salesArr.length === 0) return null
          const total = salesArr.reduce((sum, s) => sum + Number(s.total), 0)
          const labels: Record<string, string> = { CASH: "Efectivo", CARD: "Tarjeta", TRANSFER: "Transferencia", CREDIT: "Crédito" }
          return (
            <div key={method} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{labels[method] ?? method}</span>
              <span className="font-mono tabular-nums">{formatCOP(total)} ({salesArr.length})</span>
            </div>
          )
        })}
      </div>

      {returns?.length > 0 && (
        <>
          <Separator />
          <div className="space-y-1 text-sm">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Devoluciones</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total devuelto</span>
              <span className="font-mono tabular-nums text-destructive">{formatCOP(Number(summary.totalReturns))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cantidad</span>
              <span className="font-mono tabular-nums">{summary.returnsCount}</span>
            </div>
          </div>
        </>
      )}

      {session.cashMovements?.length > 0 && (
        <>
          <Separator />
          <div className="space-y-1 text-sm">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Movimientos extras</p>
            {session.cashMovements.map((m: { id: string; type: string; amount: number; reason: string }) => (
              <div key={m.id} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{m.type === STOCK_MOVEMENT_TYPE.IN ? "Ingreso" : "Retiro"}: {m.reason}</span>
                <span className={`font-mono tabular-nums ${m.type === STOCK_MOVEMENT_TYPE.IN ? "text-success" : "text-destructive"}`}>
                  {m.type === STOCK_MOVEMENT_TYPE.IN ? "+" : "-"}{formatCOP(Number(m.amount))}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <Separator />

      <div className="space-y-2 rounded-lg bg-muted p-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Cálculo de cierre</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Base inicial</span><span className="font-mono tabular-nums">{formatCOP(Number(session.openingBalance))}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Efectivo esperado</span><span className="font-mono tabular-nums">{formatCOP(Number(session.expectedClosing))}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Efectivo contado</span><span className="font-mono tabular-nums">{formatCOP(Number(session.closingBalance))}</span></div>
          <Separator />
          <div className={`flex justify-between font-semibold ${
            Number(session.difference) === 0 ? "text-success" : "text-destructive"
          }`}>
            <span>Diferencia</span>
            <span className="font-mono tabular-nums">{formatCOP(Number(session.difference))}</span>
          </div>
        </div>
      </div>

      <div className="pt-4 text-center text-xs text-muted-foreground">
        <p>_________________________</p>
        <p className="mt-1">Firma del responsable</p>
      </div>
    </div>
  ) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Recibo de cierre de caja</DialogTitle>
          {reportContent && (
            <DialogDescription>
              Entrega este recibo junto con el dinero al responsable
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto">
          {isLoading ? loadingContent : hasError ? errorContent : reportContent}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!isLoading && reportContent && (
            <Button onClick={handlePrint} disabled={isPrinting} className="w-full sm:w-auto">
              <Printer className="mr-2 size-4" /> {isPrinting ? "Imprimiendo..." : "Imprimir recibo"}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
