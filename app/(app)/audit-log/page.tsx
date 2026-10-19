"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Pagination,
} from "@/components/ui/pagination"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Search, History, Clock } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const ACTION_LABELS: Record<string, string> = {
  USER_CREATED: "Usuario creado",
  USER_UPDATED: "Usuario actualizado",
  USER_ROLE_CHANGED: "Rol cambiado",
  USER_DEACTIVATED: "Usuario desactivado",
  USER_REACTIVATED: "Usuario reactivado",
  USER_PASSWORD_RESET: "Password reseteado",
  COMPANY_CREATED: "Empresa creada",
  COMPANY_UPDATED: "Empresa actualizada",
  COMPANY_DEACTIVATED: "Empresa desactivada",
  COMPANY_FACTUS_BLOCKED: "FE bloqueada",
  COMPANY_FACTUS_UNBLOCKED: "FE desbloqueada",
  INVITE_CREATED: "Invitación creada",
  INVITE_USED: "Invitación usada",
  INVITE_DELETED: "Invitación eliminada",
  FACTUS_CONFIG_UPDATED: "Configuración de Factus",
  PERMISSION_RULE_CHANGED: "Permisos por rol",
  FACTUS_CREDITS_PURCHASED: "Créditos comprados",
  FACTUS_CREDITS_CONSUMED: "Crédito consumido",
  FACTUS_INVOICE_CREATED: "Factura creada",
  FACTUS_CREDIT_NOTE_CREATED: "Nota crédito creada",
  FACTUS_INVOICE_CLEANED: "Documento pendiente limpiado de Factus",
  CASH_SESSION_OPENED: "Sesión abierta",
  CASH_SESSION_CLOSED: "Sesión cerrada",
  CASH_MOVEMENT_CREATED: "Movimiento de caja",
  CASH_REGISTER_CREATED: "Caja registradora creada",
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState("")
  const [userFilter, setUserFilter] = useState("")
  const [selectedLog, setSelectedLog] = useState<any | null>(null)

  async function fetchLogs(p: number = 1) {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("page", String(p))
    if (actionFilter) params.set("action", actionFilter)
    if (userFilter) params.set("userId", userFilter)
    try {
      const res = await fetch(`/api/audit-log?${params}`)
      const data = await res.json()
      setLogs(data.logs ?? [])
      setTotal(data.total)
      setPages(data.pages)
      setPage(p)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs(1) }, [actionFilter, userFilter])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Auditoría del Sistema</h1>
        <p className="text-sm text-muted-foreground">Registro de todas las acciones críticas en el sistema</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Acción</Label>
          <Select value={actionFilter} onValueChange={(v) => setActionFilter(!v || v === "all" ? "" : v)}>
            <SelectTrigger className="w-48 h-10">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">ID de Usuario</Label>
          <Input
            placeholder="Filtrar por usuario..."
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-48 h-10"
          />
        </div>
        <Button onClick={() => fetchLogs(page)} className="h-10">
          <Search className="mr-2 size-4" /> Actualizar
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <History className="size-12 text-muted-foreground/40" />
              <p className="mt-4 text-sm text-muted-foreground">Sin registros de auditoría</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="hidden md:table-cell">Entidad</TableHead>
                  <TableHead className="hidden lg:table-cell">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <TableRow key={log.id} className="cursor-pointer" onClick={() => setSelectedLog(log)}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(log.createdAt), "dd/MM/yy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.user ? (
                        <span className="flex flex-col">
                          <span className="font-medium">{log.user.name}</span>
                          <span className="text-xs text-muted-foreground">{log.user.email}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Sistema</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.company?.name ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {log.entity} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ""}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                      {log.metadata ? JSON.stringify(log.metadata).slice(0, 80) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} pages={pages} total={total} onPageChange={fetchLogs} />

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Auditoría</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Acción:</span> {ACTION_LABELS[selectedLog.action] ?? selectedLog.action}</div>
                <div><span className="text-muted-foreground">Fecha:</span> {format(new Date(selectedLog.createdAt), "dd/MM/yy HH:mm:ss", { locale: es })}</div>
                <div><span className="text-muted-foreground">Usuario:</span> {selectedLog.user?.name ?? "Sistema"} ({selectedLog.user?.email ?? "—"})</div>
                <div><span className="text-muted-foreground">Empresa:</span> {selectedLog.company?.name ?? "—"}</div>
                <div><span className="text-muted-foreground">Entidad:</span> {selectedLog.entity} {selectedLog.entityId && `#${selectedLog.entityId}`}</div>
                <div><span className="text-muted-foreground">IP:</span> {selectedLog.ipAddress ?? "—"}</div>
              </div>
              {selectedLog.metadata && (
                <div>
                  <span className="text-muted-foreground">Metadata:</span>
                  <pre className="mt-1 rounded-lg bg-muted p-3 text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedLog(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
