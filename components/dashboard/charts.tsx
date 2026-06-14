"use client"

import { useState } from "react"

import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { formatCOP } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

const COLORS = ["#16A34A", "#2563EB", "#CABA04", "#DC2626", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16"]

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
  data: Array<Record<string, string | number>>
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Sin ventas este mes
      </div>
    )
  }

  const productNames = Object.keys(data[0]).filter((k) => k !== "date")

  function handleLegendClick(data: Record<string, unknown>) {
    const dataKey = data.dataKey as string
    if (!dataKey) return
    const next = new Set(hidden)
    if (next.has(dataKey)) next.delete(dataKey)
    else next.add(dataKey)
    setHidden(next)
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
          labelFormatter={(label) => new Date(label + "T00:00:00").toLocaleDateString("es")}
          formatter={(value: any) => formatCOP(Number(value))}
        />
        <Legend onClick={(data: any) => handleLegendClick(data)} wrapperStyle={{ fontSize: 11, cursor: "pointer" }} />
        {productNames.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
            hide={hidden.has(name)}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ChartSkeleton() {
  return <Skeleton className="h-full w-full" />
}
