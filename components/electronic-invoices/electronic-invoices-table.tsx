"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Pagination } from "@/components/ui/pagination"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Zap, Download, Mail, RefreshCw, FileText, Loader2 } from "lucide-react"
import { sileo } from "sileo"

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Pendiente", variant: "secondary" },
  VALIDATED: { label: "Validada", variant: "default" },
  ACCEPTED: { label: "Aceptada", variant: "default" },
  REJECTED: { label: "Rechazada", variant: "destructive" },
  CANCELLED: { label: "Cancelada", variant: "destructive" },
}

function formatCOP(value: number | string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value))
}

export function ElectronicInvoicesTable() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState("")
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)

  useEffect(() => {
    fetchInvoices(1)
  }, [statusFilter])

  async function fetchInvoices(p: number = 1) {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("page", String(p))
    params.set("pageSize", "20")
    if (statusFilter) params.set("status", statusFilter)

    try {
      const res = await fetch(`/api/factus/invoices?${params}`)
      const data = await res.json()
      setInvoices(data.invoices ?? [])
      setTotal(data.total)
      setPages(data.pages)
      setPage(p)
    } catch {
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadPdf(id: string) {
    setDownloadingId(id)
    try {
      const res = await fetch(`/api/factus/invoices/${id}?format=pdf`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `factura-${id}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (e) {
      console.error("Error downloading PDF:", e)
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleDownloadXml(id: string) {
    setDownloadingId(id)
    try {
      const res = await fetch(`/api/factus/invoices/${id}?format=xml`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `factura-${id}.xml`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (e) {
      console.error("Error downloading XML:", e)
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleSendEmail(id: string) {
    setSendingId(id)
    try {
      const res = await fetch(`/api/factus/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-email" }),
      })
      const data = await res.json()
      if (res.ok) {
        sileo.success({ title: "Email enviado correctamente" })
      } else {
        sileo.error({ title: data.error || "Error al enviar email" })
      }
    } catch (e) {
      console.error("Error sending email:", e)
      sileo.error({ title: "Error al enviar email" })
    } finally {
      setSendingId(null)
    }
  }

  async function handleRefreshStatus(id: string) {
    try {
      const res = await fetch(`/api/factus/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh-status" }),
      })
      if (res.ok) {
        fetchInvoices(page)
      }
    } catch (e) {
      console.error("Error refreshing status:", e)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Facturas Electrónicas</h1>
          <p className="text-sm text-muted-foreground">Documentos electrónicos DIAN</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Estado</label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? "" : (v ?? ""))}>
            <SelectTrigger className="w-full sm:w-40 h-10">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="PENDING">Pendiente</SelectItem>
              <SelectItem value="VALIDATED">Validada</SelectItem>
              <SelectItem value="ACCEPTED">Aceptada</SelectItem>
              <SelectItem value="REJECTED">Rechazada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => fetchInvoices(1)} className="h-10 w-full md:w-auto">
          <RefreshCw className="mr-2 size-4" />
          Actualizar
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Zap className="size-12 text-muted-foreground/40" />
          <p className="mt-4 text-sm font-medium text-muted-foreground">Sin facturas electrónicas</p>
          <p className="text-xs text-muted-foreground/60">
            Las facturas electrónicas aparecerán aquí cuando se generen desde el POS
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Consecutivo</TableHead>
                <TableHead className="hidden md:table-cell">Fecha</TableHead>
                <TableHead className="hidden md:table-cell">Cliente</TableHead>
                <TableHead className="hidden lg:table-cell">CUFE</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="hidden sm:table-cell text-center">Estado</TableHead>
                <TableHead className="w-32 sm:w-48 text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv: any) => {
                const status = STATUS_LABELS[inv.status] ?? { label: inv.status, variant: "outline" as const }
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">
                      {inv.consecutive ?? inv.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {format(new Date(inv.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {inv.sale?.customer?.name ?? <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-xs text-muted-foreground max-w-[180px] truncate">
                      {inv.cufe ?? <span className="text-muted-foreground/30">Sin CUFE</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-medium">
                      {formatCOP(inv.total)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center">
                      <Badge variant={status.variant} className="text-xs font-normal">
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 md:size-8 touch-target"
                          title="Descargar PDF"
                          aria-label="Descargar PDF"
                          disabled={!inv.factusBillId || downloadingId === inv.id}
                          onClick={() => handleDownloadPdf(inv.id)}
                        >
                          {downloadingId === inv.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Download className="size-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 md:size-8 touch-target"
                          title="Descargar XML"
                          aria-label="Descargar XML"
                          disabled={!inv.factusBillId || downloadingId === inv.id}
                          onClick={() => handleDownloadXml(inv.id)}
                        >
                          <FileText className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 md:size-8 touch-target"
                          title="Enviar por email"
                          aria-label="Enviar por email"
                          disabled={!inv.factusBillId || sendingId === inv.id}
                          onClick={() => handleSendEmail(inv.id)}
                        >
                          {sendingId === inv.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Mail className="size-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 md:size-8 touch-target"
                          title="Actualizar estado"
                          aria-label="Actualizar estado"
                          onClick={() => handleRefreshStatus(inv.id)}
                        >
                          <RefreshCw className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination
        page={page}
        pages={pages}
        total={total}
        onPageChange={fetchInvoices}
      />
    </div>
  )
}
