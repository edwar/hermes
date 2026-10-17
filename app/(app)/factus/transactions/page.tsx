"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Pagination,
} from "@/components/ui/pagination"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Coins } from "lucide-react"
import { formatCOP } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ExportCSVButton } from "@/components/shared/export-csv-button"
import { FACTUS_TRANSACTION_TYPE } from "@/lib/constants"

export default function FactusTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState("")

  async function fetchTx(p: number = 1) {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("page", String(p))
    if (typeFilter) params.set("type", typeFilter)
    try {
      const res = await fetch(`/api/factus/credits/transactions?${params}`)
      const data = await res.json()
      setTransactions(data.transactions ?? [])
      setTotal(data.total)
      setPages(data.pages)
      setPage(p)
    } catch {
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTx(1) }, [typeFilter])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transacciones Factus</h1>
        <p className="text-sm text-muted-foreground">Historial de compras y consumos de créditos de facturación</p>
      </div>

      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Tipo</label>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(!v || v === "all" ? "" : v)}>
            <SelectTrigger className="w-40 h-10">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value={FACTUS_TRANSACTION_TYPE.PURCHASE}>Compras</SelectItem>
              <SelectItem value={FACTUS_TRANSACTION_TYPE.CONSUMPTION}>Consumos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => fetchTx(1)} className="h-10">
          <RefreshCw className="mr-2 size-4" /> Actualizar
        </Button>
        <ExportCSVButton report="credit-transactions" />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Coins className="size-12 text-muted-foreground/40" />
              <p className="mt-4 text-sm text-muted-foreground">Sin transacciones</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Saldo después</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(tx.createdAt), "dd/MM/yy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{tx.company?.name ?? "—"}</TableCell>
                    <TableCell>
                      {tx.type === FACTUS_TRANSACTION_TYPE.PURCHASE ? (
                        <Badge className="bg-success/10 text-success border-0 text-[10px]">
                          Compra
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Consumo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {tx.type === FACTUS_TRANSACTION_TYPE.PURCHASE ? "+" : "-"}{tx.amount}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {tx.balanceAfter}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                      {tx.notes ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} pages={pages} total={total} onPageChange={fetchTx} />
    </div>
  )
}
