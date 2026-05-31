"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCOP, formatDateTime } from "@/lib/utils"
import { Search } from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  CREDIT: "Crédito",
}

async function fetchSales(params: URLSearchParams) {
  const res = await fetch(`/api/sales?${params}`)
  if (!res.ok) throw new Error("Error al cargar ventas")
  return res.json()
}

export default function ReportsPage() {
  const today = new Date().toISOString().split("T")[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]

  const [from, setFrom] = useState(thirtyDaysAgo)
  const [to, setTo] = useState(today)
  const [page, setPage] = useState(1)

  const params = new URLSearchParams({ from, to, page: String(page), pageSize: "15" })
  const { data, isLoading } = useQuery({
    queryKey: ["sales-report", from, to, page],
    queryFn: () => fetchSales(params),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Reportes de Ventas</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecciona el rango de fechas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Desde</span>
              <Input
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setPage(1) }}
              />
            </div>
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Hasta</span>
              <Input
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setPage(1) }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {data?.sales && data.sales.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ingresos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.sales.map((s: any) => ({
                    date: s.createdAt.split("T")[0],
                    total: Number(s.total),
                  })).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatCOP(typeof v === "number" ? v : 0)} />
                    <Line type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Totales del período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total ventas</span>
                  <span>{formatCOP(data.sales.reduce((a: number, s: any) => a + Number(s.total), 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cantidad de tickets</span>
                  <span>{data.total}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ventas</CardTitle>
          <CardDescription>
            {data?.total ?? 0} ventas encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Cajero</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data?.sales?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No hay ventas en este período
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.sales?.map((sale: any) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-xs">
                        #{sale.id.slice(-8).toUpperCase()}
                      </TableCell>
                      <TableCell>{formatDateTime(sale.createdAt)}</TableCell>
                      <TableCell>{sale.items?.length ?? 0}</TableCell>
                      <TableCell>{PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}</TableCell>
                      <TableCell>{sale.user?.name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCOP(Number(sale.total))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {data?.pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {page} de {data.pages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
