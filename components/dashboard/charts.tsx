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

// Paleta de datos derivada de la sintaxis de la consola. El rojo se reserva para error y rechazo.
const COLORS = ["#79C0FF", "#56D364", "#E3B341", "#C678DD", "#FF9E64", "#2DD4BF", "#F0883E", "#A5B4FC", "#B6E36A", "#F778BA"]

const AXIS_TICK = { fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "var(--font-geist-mono)" }
const AXIS_LINE = { stroke: "var(--border)" }
const TOOLTIP_STYLE = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    fontSize: 12,
    color: "var(--foreground)",
  },
  labelStyle: { color: "var(--muted-foreground)", fontFamily: "var(--font-geist-mono)", fontSize: 11 },
  itemStyle: { color: "var(--foreground)" },
  cursor: { stroke: "var(--seam-strong)" },
}

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
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false}
          tickFormatter={(v) => {
            const d = new Date(v + "T00:00:00")
            return d.toLocaleDateString("es", { day: "2-digit", month: "2-digit" })
          }}
        />
        <YAxis tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(value) => formatCOP(typeof value === "number" ? value : 0)}
          labelFormatter={(label) => new Date(label + "T00:00:00").toLocaleDateString("es")}
        />
        <Line type="monotone" dataKey="total" stroke="var(--info)" strokeWidth={2} dot={false} />
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
          cy="42%"
          innerRadius={52}
          outerRadius={84}
          stroke="var(--card)"
          strokeWidth={2}
        >
          {data.map((_, i: number) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Legend
          verticalAlign="bottom"
          formatter={(value: string) => PAYMENT_LABELS[value] ?? value}
          wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
        />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(value, name) => [formatCOP(typeof value === "number" ? value : 0), PAYMENT_LABELS[String(name)] ?? String(name)]}
        />
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
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false}
          tickFormatter={(v) => {
            const d = new Date(v + "T00:00:00")
            return d.toLocaleDateString("es", { day: "2-digit", month: "2-digit" })
          }}
        />
        <YAxis tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          {...TOOLTIP_STYLE}
          labelFormatter={(label) => new Date(label + "T00:00:00").toLocaleDateString("es")}
          formatter={(value: any) => formatCOP(Number(value))}
        />
        <Legend onClick={(data: any) => handleLegendClick(data)} wrapperStyle={{ fontSize: 11, cursor: "pointer", color: "var(--muted-foreground)" }} />
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
