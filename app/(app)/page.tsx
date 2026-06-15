"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useDashboard } from "@/features/dashboard/hooks/use-dashboard"
import { useSession } from "next-auth/react"
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
    if (session?.user?.role === "GOD") router.replace("/system-settings")
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
        <Card className="lg:col-span-2 border-pos-border">
          <CardHeader>
            <CardTitle className="font-sans">Ventas (30 días)</CardTitle>
            <CardDescription>Ingresos diarios del último mes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 md:h-80">
              <DailySalesChart data={dailySales} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-pos-border">
          <CardHeader>
            <CardTitle className="font-sans">Método de Pago</CardTitle>
            <CardDescription>Distribución del mes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 md:h-80">
              <PaymentMethodsChart data={paymentMethods} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-pos-border">
        <CardHeader>
          <CardTitle className="font-sans">Productos Más Vendidos</CardTitle>
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
