"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { sileo } from "sileo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ROLE_LABELS } from "@/lib/guide/content"
import type { UserMatrix } from "@/lib/permissions/matrix"

type PersonOption = { id: string; name: string; email: string; role: string; company?: { id: string; name: string } | null }

const SOURCE_TEXT = { default: "Por defecto", global: "Global", company: "Empresa", user: "Personal", owner: "Fijo" } as const

/** Permisos de una sola persona, por encima de los de su rol: para casos puntuales ("este cajero también ve Inventario"). */
export function PermissionsByPerson() {
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const queryKey = ["permissions-person", userId]

  const { data: people = [] } = useQuery<PersonOption[]>({
    queryKey: ["permissions-people"],
    queryFn: async () => {
      const res = await fetch("/api/users")
      if (!res.ok) throw new Error()
      return res.json()
    },
  })

  const { data: matrix, isLoading } = useQuery<UserMatrix>({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      const res = await fetch(`/api/god/permissions?userId=${encodeURIComponent(userId!)}`)
      if (!res.ok) throw new Error("No se pudieron cargar los permisos")
      return res.json()
    },
  })

  const person = people.find((p) => p.id === userId)
  const customized = matrix ? Object.values(matrix.cells).filter((c) => c.overridden).length : 0
  const labelOf = (p: PersonOption) => `${p.name} · ${p.company?.name ?? "Sin empresa"} · ${ROLE_LABELS[p.role as keyof typeof ROLE_LABELS] ?? p.role}`

  async function toggle(module: string, allowed: boolean) {
    setPending(module)
    try {
      const res = await fetch("/api/god/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, module, allowed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        sileo.error({ title: data.error ?? "No se pudo guardar el permiso" })
        return
      }
      queryClient.setQueryData(queryKey, data.matrix)
    } catch {
      sileo.error({ title: "No se pudo guardar el permiso" })
    } finally {
      setPending(null)
    }
  }

  async function reset() {
    try {
      const res = await fetch(`/api/god/permissions?userId=${encodeURIComponent(userId!)}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        sileo.error({ title: data.error ?? "No se pudo restablecer" })
        return
      }
      queryClient.setQueryData(queryKey, data.matrix)
      sileo.success({ title: "Esta persona vuelve a los permisos de su rol" })
    } catch {
      sileo.error({ title: "No se pudo restablecer" })
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="permissions-person" className="text-xs">Persona</Label>
        <Select value={userId ?? ""} onValueChange={(v) => setUserId(v || null)}>
          <SelectTrigger id="permissions-person" className="w-full sm:w-96">
            <SelectValue placeholder="Elige a una persona">{person ? labelOf(person) : null}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {people.map((p) => (
              <SelectItem key={p.id} value={p.id}>{labelOf(p)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Lo que cambies aquí gana sobre los permisos de su rol y de su empresa, solo para esta persona.
        </p>
      </div>

      {userId && (isLoading || !matrix) ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : matrix ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {customized === 0 ? "Sin cambios personales" : `${customized} cambio${customized === 1 ? "" : "s"} personal${customized === 1 ? "" : "es"}`}
            </p>
            <Button variant="ghost" size="sm" disabled={customized === 0} onClick={reset}>
              Restablecer
            </Button>
          </div>
          <div className="rounded-lg border border-border">
            <Table aria-label="Permisos de la persona">
              <TableHeader>
                <TableRow>
                  <TableHead>Módulo</TableHead>
                  <TableHead className="text-center">Acceso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrix.modules.map(({ module, label }) => {
                  const cell = matrix.cells[module]
                  return (
                    <TableRow key={module}>
                      <TableCell className="font-medium">{label}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Switch
                            aria-label={`${label} para ${person?.name ?? "la persona"}`}
                            checked={cell.allowed}
                            disabled={cell.locked || pending === module}
                            onCheckedChange={(checked) => toggle(module, !!checked)}
                          />
                          <Badge variant={cell.overridden ? "warning" : "outline"} className="text-[10px]">
                            {cell.locked ? SOURCE_TEXT.owner : cell.overridden ? SOURCE_TEXT.user : SOURCE_TEXT[cell.source]}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}
    </div>
  )
}
