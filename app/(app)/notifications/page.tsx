"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card, CardContent,
} from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Pagination } from "@/components/ui/pagination"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  const fetchNotifications = useCallback(async (p: number = 1) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/notifications?page=${p}`)
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setTotal(data.total)
      setUnread(data.unread)
      setPages(data.pages)
      setPage(p)
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchNotifications(1) }, [fetchNotifications])

  async function handleRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" })
    fetchNotifications(page)
  }

  async function handleReadAll() {
    setMarkingAll(true)
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read-all" }),
      })
      fetchNotifications(1)
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notificaciones</h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0 ? `${unread} sin leer` : "Todas leídas"}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={handleReadAll} disabled={markingAll}>
            {markingAll ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCheck className="mr-2 size-4" />}
            Marcar todas leídas
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Bell className="size-12 text-muted-foreground/40" />
              <p className="mt-4 text-sm text-muted-foreground">Sin notificaciones</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-6"></TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Mensaje</TableHead>
                  <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                  <TableHead className="text-right">Fecha</TableHead>
                  <TableHead className="w-20 text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((n: any) => (
                  <TableRow key={n.id} className={!n.readAt ? "bg-muted/30" : ""}>
                    <TableCell>
                      {!n.readAt && <span className="block size-2 rounded-full bg-primary" />}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{n.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                      {n.message ?? "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {n.type === "FACTUS_LOW_CREDIT" ? (
                        <Badge variant="secondary" className="text-[10px]">Créditos</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">{n.type}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs whitespace-nowrap">
                      {format(new Date(n.createdAt), "dd/MM/yy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      {!n.readAt && (
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleRead(n.id)}>
                          Leer
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} pages={pages} total={total} onPageChange={fetchNotifications} />
    </div>
  )
}
