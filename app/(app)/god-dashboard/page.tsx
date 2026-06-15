"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Building2, Coins, Zap, ShieldAlert, TrendingUp, ShoppingCart, AlertTriangle, Eye,
} from "lucide-react"
import { formatCOP } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { StatCard } from "@/components/dashboard/stat-card"

export default function GodDashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [overview, setOverview] = useState<any>(null)
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.role === "GOD") {
      Promise.all([
        fetch("/api/god/overview").then((r) => r.json()),
        fetch("/api/companies").then((r) => r.json()),
      ])
        .then(([ov, comps]) => {
          setOverview(ov)
          setCompanies(comps)
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    } else if (session && session.user.role !== "GOD") {
      router.replace("/")
    }
  }, [session, router])

  if (!session || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (session.user.role !== "GOD") return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel de Administración</h1>
        <p className="text-sm text-muted-foreground">Visión general de todas las empresas</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Empresas" value={overview?.totalCompanies ?? 0} subtitle={`${overview?.activeCompanies ?? 0} activas`} icon={Building2} />
        <StatCard title="Con Factus" value={overview?.factusEnabled ?? 0} subtitle={`${overview?.factusBlocked ?? 0} bloqueadas`} icon={Zap} />
        <StatCard title="Créditos Vendidos" value={overview?.totalCreditsSold ?? 0} subtitle={`${overview?.totalCreditsRemaining ?? 0} disponibles`} icon={Coins} />
        <StatCard title="Ventas del Mes" value={formatCOP(overview?.monthSales?.total ?? 0)} subtitle={`${overview?.monthSales?.count ?? 0} tickets`} icon={ShoppingCart} />
      </div>

      {overview?.lowCreditCompanies?.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-amber-500" />
              Empresas con saldo bajo de créditos (&le;10)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overview.lowCreditCompanies.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span className="font-medium">{c.name}</span>
                <Badge variant="secondary">{c.factusCreditBalance} créditos</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Todas las Empresas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>NIT</TableHead>
                <TableHead>Factus</TableHead>
                <TableHead className="text-right">Créditos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right w-20">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.nit || "—"}</TableCell>
                  <TableCell>
                    {c.factusEnabled ? (
                      c.factusBlocked ? (
                        <Badge variant="destructive" className="text-[10px]">Bloqueado</Badge>
                      ) : (
                        <Badge className="text-[10px] bg-green-600">Activo</Badge>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{c.factusCreditBalance ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={c.isActive ? "default" : "secondary"} className="text-[10px]">
                      {c.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/god-companies/${c.id}`)}>
                      <Eye className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
