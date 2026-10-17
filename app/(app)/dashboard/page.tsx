"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useDashboard } from "@/features/dashboard/hooks/use-dashboard"
import { useSession } from "next-auth/react"
import { StatStrip } from "@/components/dashboard/stat-card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCOP } from "@/lib/utils"
import { ChartSkeleton } from "@/components/dashboard/charts"

const DailySalesChart = dynamic(
  () => import("@/components/dashboard/charts").then((m) => m.DailySalesChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
)
const PaymentMethodsChart = dynamic(
  () => import("@/components/dashboard/charts").then((m) => m.PaymentMethodsChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
)
const TopProductsChart = dynamic(
  () => import("@/components/dashboard/charts").then((m) => m.TopProductsChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
)

export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { data, isLoading } = useDashboard()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (session?.user?.role === "GOD") router.replace("/god-dashboard")
  }, [session, router])

  useEffect(() => { setMounted(true) }, [])

  if (session?.user?.role === "GOD") return null

  if (isLoading || !mounted) return <DashboardSkeleton />

  const stats = data?.stats
  const dailySales = data?.dailySales ?? []
  const topProducts = data?.topProducts ?? []
  const topProductsDaily = data?.topProductsDaily ?? []
  const paymentMethods = data?.salesByPaymentMethod ?? []

  return (
    <div className="space-y-6">
      <StatStrip
        cells={[
          { label: "Ventas hoy", value: formatCOP(stats?.salesToday ?? 0), detail: `${stats?.ticketsToday ?? 0} tickets hoy` },
          { label: "Ventas del mes", value: formatCOP(stats?.salesMonth ?? 0), detail: "Acumulado mensual" },
          {
            label: "Stock bajo",
            value: String(stats?.lowStockProducts ?? 0),
            detail: (stats?.lowStockProducts ?? 0) > 0 ? "Productos por reponer" : "Todo el stock al día",
            tone: (stats?.lowStockProducts ?? 0) > 0 ? "warning" : "default",
          },
          { label: "Productos activos", value: String(stats?.totalProducts ?? 0), detail: "En inventario" },
        ]}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ventas (30 días)</CardTitle>
            <CardDescription>Ingresos diarios del último mes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 md:h-80">
              <DailySalesChart data={dailySales} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Método de Pago</CardTitle>
            <CardDescription>Distribución del mes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 md:h-80">
              <PaymentMethodsChart data={paymentMethods} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Productos Más Vendidos</CardTitle>
          <CardDescription>Top 10 del mes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 md:h-72">
            <TopProductsChart data={topProductsDaily} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-5 py-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-28" />
            <Skeleton className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border p-4 lg:col-span-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-1 h-4 w-48" />
          <Skeleton className="mt-4 h-64 w-full md:h-80" />
        </div>
        <div className="rounded-lg border border-border p-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-1 h-4 w-48" />
          <Skeleton className="mt-4 h-64 w-full md:h-80" />
        </div>
      </div>
      <div className="rounded-lg border border-border p-4">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="mt-1 h-4 w-52" />
        <Skeleton className="mt-4 h-64 w-full md:h-72" />
      </div>
    </div>
  )
}
