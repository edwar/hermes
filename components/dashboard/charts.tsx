"use client"

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { formatCOP } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

const COLORS = ["#16A34A", "#2563EB", "#CABA04", "#DC2626"]

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  CREDIT: "Crédito",
}

export function DailySalesChart({ data }: { data: Array<{ date: string; total: number }> }) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Sin ventas en los últimos 30 días
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => {
            const d = new Date(v + "T00:00:00")
            return d.toLocaleDateString("es", { day: "2-digit", month: "2-digit" })
          }}
        />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(value) => formatCOP(typeof value === "number" ? value : 0)}
          labelFormatter={(label) => new Date(label + "T00:00:00").toLocaleDateString("es")}
        />
        <Line type="monotone" dataKey="total" stroke="#004F6E" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function PaymentMethodsChart({
  data,
}: {
  data: Array<{ method: string; total: number }>
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Sin ventas este mes
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="method"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ method, percent }: { method?: string; percent?: number }) =>
            `${PAYMENT_LABELS[method ?? ""] ?? method ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
        >
          {data.map((_, i: number) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatCOP(typeof value === "number" ? value : 0)} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function TopProductsChart({
  data,
}: {
  data: Array<{ name: string; total: number }>
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Sin ventas este mes
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 120 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
        <Tooltip formatter={(value) => formatCOP(typeof value === "number" ? value : 0)} />
        <Bar dataKey="total" fill="#2563EB" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ChartSkeleton() {
  return <Skeleton className="h-full w-full" />
}
