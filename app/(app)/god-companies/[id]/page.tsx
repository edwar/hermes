"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Coins, ShoppingCart, History, AlertTriangle, Eye, CheckCircle, Loader2 } from "lucide-react"
import { formatCOP } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function GodCompanyDetailPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const companyId = params.id as string
  const toast = useToast()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)
  const [activateAmount, setActivateAmount] = useState<number>(0)

  useEffect(() => {
    if (session?.user?.role !== "GOD") return
    fetch(`/api/god/companies/${companyId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [session, companyId])

  async function handleActivate() {
    if (!activateAmount || activateAmount <= 0) return
    setActivating(true)
    try {
      const res = await fetch("/api/factus/credits/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, amount: activateAmount }),
      })
      const result = await res.json()
      if (res.ok) {
        toast.success(`${activateAmount} créditos activados`)
        setActivateAmount(0)
        fetch(`/api/god/companies/${companyId}`)
          .then((r) => r.json())
          .then(setData)
      } else {
        toast.error(result.error || "Error al activar")
      }
    } catch {
      toast.error("Error al activar créditos")
    } finally {
      setActivating(false)
    }
  }

  if (!session || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!data) return null

  const { company, monthSales, creditTransactions, recentSales, recentAuditLogs } = data
  const companyIdShort = company.id?.slice(0, 8)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/god-dashboard")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{company.name}</h1>
          <p className="text-sm text-muted-foreground">
            {company.nit ? `NIT ${company.nit}` : "Sin NIT"}
            {company.email && ` · ${company.email}`}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant={company.isActive ? "default" : "secondary"}>
            {company.isActive ? "Activa" : "Inactiva"}
          </Badge>
          {company.factusBlocked && (
            <Badge variant="destructive">
              <AlertTriangle className="mr-1 size-3" /> FE Bloqueada
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Usuarios</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{company._count?.users ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Productos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{company._count?.products ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Clientes</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{company._count?.customers ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Créditos Factus</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{company.factusCreditBalance ?? 0}</p>
            <p className="text-xs text-muted-foreground">{company.factusCreditTotal ?? 0} comprados históricamente</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ventas">
        <TabsList>
          <TabsTrigger value="ventas"><ShoppingCart className="mr-1.5 size-3.5" /> Ventas</TabsTrigger>
          <TabsTrigger value="factus"><Coins className="mr-1.5 size-3.5" /> Factus</TabsTrigger>
          <TabsTrigger value="auditoria"><History className="mr-1.5 size-3.5" /> Auditoría</TabsTrigger>
        </TabsList>

        <TabsContent value="ventas" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Ventas del Mes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCOP(monthSales?.total ?? 0)}</p>
                <p className="text-xs text-muted-foreground">{monthSales?.count ?? 0} tickets</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Últimas Ventas</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Cajero</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales?.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{format(new Date(s.createdAt), "dd/MM HH:mm", { locale: es })}</TableCell>
                      <TableCell className="font-mono">{formatCOP(s.total)}</TableCell>
                      <TableCell className="text-xs">{s.paymentMethod}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.customer?.name ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.user?.name ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(!recentSales || recentSales.length === 0) && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sin ventas</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="factus" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Créditos Disponibles</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{company.factusCreditBalance ?? 0}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Créditos Comprados</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{company.factusCreditTotal ?? 0}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Factus Habilitado</CardTitle></CardHeader>
              <CardContent>
                {company.factusEnabled ? (
                  company.factusBlocked
                    ? <Badge variant="destructive">Bloqueado</Badge>
                    : <Badge className="bg-green-600">Activo</Badge>
                ) : (
                  <Badge variant="secondary">No</Badge>
                )}
              </CardContent>
            </Card>
          </div>

          {company.factusCreditPending > 0 && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="size-3.5 text-amber-500" />
                  Créditos pendientes de activación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm">
                  Hay <strong>{company.factusCreditPending}</strong> créditos pendientes por activar.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={company.factusCreditPending}
                    value={activateAmount || ""}
                    onChange={(e) => setActivateAmount(parseInt(e.target.value) || 0)}
                    placeholder="Cantidad"
                    className="w-32"
                  />
                  <Button
                    size="sm"
                    onClick={handleActivate}
                    disabled={activating || !activateAmount || activateAmount <= 0}
                  >
                    {activating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle className="mr-2 size-4" />}
                    Activar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Últimos Movimientos de Créditos</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditTransactions?.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs">{format(new Date(tx.createdAt), "dd/MM HH:mm", { locale: es })}</TableCell>
                      <TableCell>
                        {tx.type === "PURCHASE"
                          ? <Badge className="bg-green-600 text-[10px]">Compra</Badge>
                          : <Badge variant="secondary" className="text-[10px]">Consumo</Badge>}
                      </TableCell>
                      <TableCell className="text-right font-mono">{tx.type === "PURCHASE" ? "+" : "-"}{tx.amount}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{tx.balanceAfter}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{tx.notes ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(!creditTransactions || creditTransactions.length === 0) && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sin movimientos</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auditoria" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Actividad Reciente</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAuditLogs?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{format(new Date(log.createdAt), "dd/MM HH:mm", { locale: es })}</TableCell>
                      <TableCell className="text-sm">{log.user?.name ?? "Sistema"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] font-normal">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {log.metadata ? JSON.stringify(log.metadata).slice(0, 60) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!recentAuditLogs || recentAuditLogs.length === 0) && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sin actividad</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
