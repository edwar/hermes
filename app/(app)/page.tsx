"use client"

import { useEffect, useState } from "react"
import { useDashboard } from "@/features/dashboard/hooks/use-dashboard"
import { StatCard } from "@/components/dashboard/stat-card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCOP } from "@/lib/utils"
import {
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
} from "lucide-react"
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

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6"]

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  CREDIT: "Crédito",
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboard()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (isLoading || !mounted) return <DashboardSkeleton />

  const stats = data?.stats
  const dailySales = data?.dailySales ?? []
  const topProducts = data?.topProducts ?? []
  const paymentMethods = data?.salesByPaymentMethod ?? []

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ventas Hoy"
          value={formatCOP(stats?.salesToday ?? 0)}
          subtitle={`${stats?.ticketsToday ?? 0} tickets hoy`}
          icon={DollarSign}
        />
        <StatCard
          title="Ventas del Mes"
          value={formatCOP(stats?.salesMonth ?? 0)}
          subtitle="Acumulado mensual"
          icon={TrendingUp}
        />
        <StatCard
          title="Productos Bajos"
          value={String(stats?.lowStockProducts ?? 0)}
          subtitle={`${stats?.totalProducts ?? 0} productos activos`}
          icon={Package}
        />
        <StatCard
          title="Stock Total"
          value={String(stats?.totalProducts ?? 0)}
          subtitle="Productos activos en inventario"
          icon={ShoppingCart}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-[oklch(0.88_0.01_50)]">
          <CardHeader>
            <CardTitle className="font-sans">Ventas (30 días)</CardTitle>
            <CardDescription>Ingresos diarios del último mes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {dailySales.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailySales}>
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
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Sin ventas en los últimos 30 días
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[oklch(0.88_0.01_50)]">
          <CardHeader>
            <CardTitle className="font-sans">Método de Pago</CardTitle>
            <CardDescription>Distribución del mes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {paymentMethods.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethods}
                      dataKey="total"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ method, percent }: { method?: string; percent?: number }) =>
                        `${PAYMENT_LABELS[method ?? ""] ?? method ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {paymentMethods.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCOP(typeof value === "number" ? value : 0)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Sin ventas este mes
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[oklch(0.88_0.01_50)]">
        <CardHeader>
          <CardTitle className="font-sans">Productos Más Vendidos</CardTitle>
          <CardDescription>Top 10 del mes</CardDescription>
        </CardHeader>
          <CardContent>
            <div className="h-72">
              {topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topProducts}
                    layout="vertical"
                    margin={{ left: 120 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      width={110}
                    />
                    <Tooltip
                      formatter={(value) => formatCOP(typeof value === "number" ? value : 0)}
                    />
                    <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Sin ventas este mes
                </div>
              )}
            </div>
          </CardContent>
      </Card>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6">
            <div className="flex items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-4" />
            </div>
            <Skeleton className="mt-2 h-8 w-20" />
            <Skeleton className="mt-1 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-1 h-4 w-48" />
          <Skeleton className="mt-4 h-72 w-full" />
        </div>
        <div className="rounded-lg border p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-1 h-4 w-48" />
          <Skeleton className="mt-4 h-72 w-full rounded-full" />
        </div>
      </div>
      <div className="rounded-lg border p-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-1 h-4 w-52" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    </div>
  )
}
