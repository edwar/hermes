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
  Coins, ShieldAlert, TrendingUp, AlertTriangle, Eye,
} from "lucide-react"
import { formatCOP } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { StatStrip } from "@/components/dashboard/stat-card"

export default function GodDashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [overview, setOverview] = useState<any>(null)
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.role === "GOD") {
      Promise.allSettled([
        fetch("/api/god/overview").then((r) => r.ok ? r.json() : null),
        fetch("/api/companies").then((r) => r.ok ? r.json() : null),
      ])
        .then(([ovResult, compsResult]) => {
          if (ovResult.status === "fulfilled") setOverview(ovResult.value)
          if (compsResult.status === "fulfilled") setCompanies(compsResult.value ?? [])
        })
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

      <StatStrip
        cells={[
          { label: "Empresas", value: String(overview?.totalCompanies ?? 0), detail: `${overview?.activeCompanies ?? 0} activas` },
          {
            label: "Con Factus",
            value: String(overview?.factusEnabled ?? 0),
            detail: `${overview?.factusBlocked ?? 0} bloqueadas`,
            tone: (overview?.factusBlocked ?? 0) > 0 ? "warning" : "default",
          },
          { label: "Créditos vendidos", value: String(overview?.totalCreditsSold ?? 0), detail: `${overview?.totalCreditsRemaining ?? 0} disponibles` },
          { label: "Ventas del mes", value: formatCOP(overview?.monthSales?.total ?? 0), detail: `${overview?.monthSales?.count ?? 0} tickets` },
        ]}
      />

      {companies.filter((c: any) => (c.factusCreditPending ?? 0) > 0).length > 0 && (
        <Card className="border-info/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Coins className="size-4 text-info" />
              Créditos pendientes de activación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {companies.filter((c: any) => (c.factusCreditPending ?? 0) > 0).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{c.nit || ""}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{c.factusCreditPending} pendientes</Badge>
                  <Button size="sm" variant="outline" onClick={() => router.push(`/god-companies/${c.id}`)}>
                    Revisar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {overview?.lowCreditCompanies?.length > 0 && (
        <Card className="border-warning/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning" />
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
          <CardTitle>Todas las Empresas</CardTitle>
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
                        <Badge className="text-[10px] bg-success text-background">Activo</Badge>
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
