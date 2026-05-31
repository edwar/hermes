"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { formatCOP } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileText } from "lucide-react"
import { SessionReport } from "./session-report"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface SessionsListProps {
  refreshKey?: number
}

async function fetchSessions() {
  const res = await fetch("/api/cash-sessions?pageSize=50")
  if (!res.ok) throw new Error("Error al cargar sesiones")
  return res.json()
}

export function SessionsList({ refreshKey }: SessionsListProps) {
  const [reportSessionId, setReportSessionId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["cash-sessions", refreshKey],
    queryFn: fetchSessions,
  })

  const sessions = data?.sessions ?? []

  return (
    <div>
      <h3 className="mb-4 font-medium">Historial de sesiones</h3>

      <div className="rounded-lg border">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : sessions.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">No hay sesiones registradas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2.5 text-left font-medium">Caja</th>
                  <th className="px-4 py-2.5 text-left font-medium">Cajero</th>
                  <th className="px-4 py-2.5 text-left font-medium">Apertura</th>
                  <th className="px-4 py-2.5 text-left font-medium">Cierre</th>
                  <th className="px-4 py-2.5 text-right font-medium">Base</th>
                  <th className="px-4 py-2.5 text-right font-medium">Esperado</th>
                  <th className="px-4 py-2.5 text-right font-medium">Contado</th>
                  <th className="px-4 py-2.5 text-right font-medium">Diferencia</th>
                  <th className="px-4 py-2.5 text-center font-medium">Estado</th>
                  <th className="px-4 py-2.5 text-center font-medium">Ventas</th>
                  <th className="px-4 py-2.5 text-center font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sessions.map((s: {
                  id: string
                  status: string
                  openingBalance: number
                  expectedClosing: number | null
                  closingBalance: number | null
                  difference: number | null
                  openedAt: string
                  closedAt: string | null
                  cashRegister: { name: string }
                  user: { name: string }
                  _count: { sales: number }
                }) => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5">{s.cashRegister.name}</td>
                    <td className="px-4 py-2.5">{s.user.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {format(new Date(s.openedAt), "dd/MM HH:mm", { locale: es })}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {s.closedAt ? format(new Date(s.closedAt), "dd/MM HH:mm", { locale: es }) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatCOP(Number(s.openingBalance))}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                      {s.expectedClosing !== null ? formatCOP(Number(s.expectedClosing)) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                      {s.closingBalance !== null ? formatCOP(Number(s.closingBalance)) : "-"}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono tabular-nums ${
                      s.difference !== null
                        ? Number(s.difference) === 0
                          ? "text-green-600"
                          : Number(s.difference) > 0
                            ? "text-amber-600"
                            : "text-destructive"
                        : ""
                    }`}>
                      {s.difference !== null ? formatCOP(Number(s.difference)) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant={s.status === "OPEN" ? "default" : "secondary"}>
                        {s.status === "OPEN" ? "Abierta" : "Cerrada"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono tabular-nums">{s._count.sales}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => setReportSessionId(s.id)}>
                        <FileText className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {reportSessionId && (
        <SessionReport sessionId={reportSessionId} open={!!reportSessionId} onOpenChange={() => setReportSessionId(null)} />
      )}
    </div>
  )
}
