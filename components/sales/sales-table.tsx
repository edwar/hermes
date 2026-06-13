"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
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
import { SaleDetail } from "@/components/sales/sale-detail"
import { useOfflineCache } from "@/hooks/use-offline-cache"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Receipt, Search, ShoppingBag } from "lucide-react"

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  CREDIT: "Crédito",
}

function getDefaultDateRange() {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    from: format(firstDay, "yyyy-MM-dd"),
    to: format(lastDay, "yyyy-MM-dd"),
  }
}

export function SalesTable() {
  const { data: session } = useSession()
  const companyId = session?.user?.companyId
  const { cacheSales, getCachedSales } = useOfflineCache()
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<any>(null)
  const [sales, setSales] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [isOfflineData, setIsOfflineData] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [paymentFilter, setPaymentFilter] = useState("")

  useEffect(() => {
    const { from: defaultFrom, to: defaultTo } = getDefaultDateRange()
    setFrom(defaultFrom)
    setTo(defaultTo)
    setInitialized(true)
  }, [])

  useEffect(() => {
    if (initialized) {
      fetchSales(1)
    }
  }, [initialized, from, to])

  async function fetchSales(p: number = 1) {
    setLoading(true)
    setIsOfflineData(false)
    const params = new URLSearchParams()
    params.set("page", String(p))
    params.set("pageSize", "20")
    if (from) params.set("from", from)
    if (to) params.set("to", to)

    try {
      const res = await fetch(`/api/sales?${params}`)
      const data = await res.json()
      if (companyId && data.sales) cacheSales(data.sales, companyId)
      let filtered = data.sales ?? []
      if (paymentFilter) {
        filtered = filtered.filter((s: any) => s.paymentMethod === paymentFilter)
      }
      setSales(filtered)
      setTotal(data.total)
      setPages(data.pages)
      setPage(p)
    } catch {
      if (companyId) {
        const cached = await getCachedSales(companyId)
        const parsed = cached.map((s) => JSON.parse(s.data))
        let filtered = parsed
        if (paymentFilter) {
          filtered = filtered.filter((s: any) => s.paymentMethod === paymentFilter)
        }
        setSales(filtered)
        setTotal(filtered.length)
        setPages(1)
        setPage(1)
        setIsOfflineData(true)
      } else {
        setSales([])
      }
    } finally {
      setLoading(false)
    }
  }

  function formatCOP(value: number | string) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Number(value))
  }

  function openDetail(sale: any) {
    setSelectedSale(sale)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Desde</label>
          <DatePicker value={from} onChange={setFrom} placeholder="Desde" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Hasta</label>
          <DatePicker value={to} onChange={setTo} placeholder="Hasta" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Método</label>
          <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v ?? " ")}>
            <SelectTrigger className="w-full sm:w-40 h-10">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">Todos</SelectItem>
              {Object.entries(PAYMENT_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => fetchSales(1)} className="h-10 w-full md:w-auto">
          <Search className="mr-2 size-4" />
          Buscar
        </Button>
        {isOfflineData && (
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-xs">
            Datos locales (sin conexión)
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : sales.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingBag className="size-12 text-muted-foreground/40" />
          <p className="mt-4 text-sm font-medium text-muted-foreground">Sin ventas</p>
          <p className="text-xs text-muted-foreground/60">
            {from || to ? "No hay ventas en este rango de fechas" : "Aún no se han realizado ventas"}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                  <TableHead>#</TableHead>
                <TableHead className="hidden md:table-cell">Fecha</TableHead>
                <TableHead className="hidden md:table-cell">Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Método</TableHead>
                <TableHead className="hidden md:table-cell">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="hidden md:table-cell w-20 text-center">Tipo</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s: any) => (
                <TableRow key={s.id} className={s.isSynced === false ? "opacity-70" : undefined}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {s.localId?.startsWith("offline-") ? s.localId.slice(0, 12) : (s.localId ?? s.id.slice(0, 8))}
                    {s.isSynced === false && (
                      <Badge variant="outline" className="ml-2 border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-normal">
                        Pendiente
                      </Badge>
                    )}
                    {s.isReturn && (
                      <Badge variant="outline" className="ml-2 border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-normal">
                        Devolución
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    {format(new Date(s.createdAt), "dd/MM/yy HH:mm", { locale: es })}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    {s.customer?.name ?? <span className="text-muted-foreground/50">—</span>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="text-xs font-normal">
                      {PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm font-mono tabular-nums">{s.items?.length ?? 0}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums font-medium">
                    {formatCOP(s.total)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    {s.isReturn ? (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-xs font-normal">
                        Devolución
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-normal">
                        Venta
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="size-9 md:size-8 touch-target" onClick={() => openDetail(s)}>
                      <Receipt className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination
        page={page}
        pages={pages}
        total={total}
        onPageChange={fetchSales}
      />

      <SaleDetail open={detailOpen} onOpenChange={setDetailOpen} sale={selectedSale} />
    </div>
  )
}
