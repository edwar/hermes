"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, ShieldCheck } from "lucide-react"
import { sileo } from "sileo"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PermissionsByPerson } from "@/components/settings/permissions-by-person"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ROLE_LABELS } from "@/lib/guide/content"
import type { PermissionMatrix } from "@/lib/permissions/matrix"

const GLOBAL = "global"
type CompanyOption = { id: string; name: string }

const SOURCE_TEXT = { default: "Por defecto", global: "Global", company: "Empresa", user: "Personal", owner: "Fijo" } as const

/** Pantalla del GOD: qué módulos puede usar cada rol, para toda la plataforma o para una empresa. */
export function PermissionsMatrix() {
  const queryClient = useQueryClient()
  const [scope, setScope] = useState<string>(GLOBAL)
  const [pending, setPending] = useState<string | null>(null)
  const [resetRole, setResetRole] = useState<string | null>(null)
  const companyId = scope === GLOBAL ? null : scope
  const queryKey = ["permissions-matrix", companyId]

  const { data: companies = [] } = useQuery<CompanyOption[]>({
    queryKey: ["permissions-companies"],
    queryFn: async () => {
      const res = await fetch("/api/companies")
      if (!res.ok) throw new Error()
      return ((await res.json()) as CompanyOption[]).map((c) => ({ id: c.id, name: c.name }))
    },
  })

  const { data: matrix, isLoading } = useQuery<PermissionMatrix>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/god/permissions${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ""}`)
      if (!res.ok) throw new Error("No se pudieron cargar los permisos")
      return res.json()
    },
  })

  async function toggle(role: string, module: string, allowed: boolean) {
    const key = `${role}:${module}`
    setPending(key)
    try {
      const res = await fetch("/api/god/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, role, module, allowed }),
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

  async function confirmReset() {
    if (!resetRole) return
    const role = resetRole
    setResetRole(null)
    try {
      const res = await fetch(`/api/god/permissions?role=${role}${companyId ? `&companyId=${encodeURIComponent(companyId)}` : ""}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        sileo.error({ title: data.error ?? "No se pudo restablecer" })
        return
      }
      queryClient.setQueryData(queryKey, data.matrix)
      sileo.success({ title: data.removed ? `Permisos de ${ROLE_LABELS[role as keyof typeof ROLE_LABELS]} restablecidos` : "No había cambios que quitar" })
    } catch {
      sileo.error({ title: "No se pudo restablecer" })
    }
  }

  const customized = (role: string) =>
    matrix ? Object.values(matrix.cells[role] ?? {}).filter((c) => c.overridden).length : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          Permisos por rol
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="rol">
          <TabsList>
            <TabsTrigger value="rol">Por rol</TabsTrigger>
            <TabsTrigger value="persona">Por persona</TabsTrigger>
          </TabsList>
          <TabsContent value="rol" className="space-y-4 pt-4">
        <div className="space-y-1.5">
          <Label htmlFor="permissions-scope" className="text-xs">Aplicar a</Label>
          <Select value={scope} onValueChange={(v) => setScope(v ?? GLOBAL)}>
            <SelectTrigger id="permissions-scope" className="w-full sm:w-80">
              <SelectValue>{scope === GLOBAL ? "Toda la plataforma (global)" : companies.find((c) => c.id === scope)?.name ?? "Empresa"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GLOBAL}>Toda la plataforma (global)</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {companyId
              ? "Los cambios aplican solo a esta empresa y ganan sobre los globales."
              : "Los cambios aplican a todas las empresas, salvo las que tengan su propia regla."}{" "}
            Cada cambio se registra en Auditoría. La persona lo nota al recargar su pantalla, en unos segundos.
          </p>
        </div>

        {isLoading || !matrix ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-lg border border-border">
            <Table aria-label="Permisos por rol y módulo">
              <TableHeader>
                <TableRow>
                  <TableHead>Módulo</TableHead>
                  {matrix.roles.map((role) => (
                    <TableHead key={role} className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span>{ROLE_LABELS[role as keyof typeof ROLE_LABELS]}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[11px]"
                          disabled={customized(role) === 0}
                          onClick={() => setResetRole(role)}
                        >
                          Restablecer ({customized(role)})
                        </Button>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrix.modules.map(({ module, label }) => (
                  <TableRow key={module}>
                    <TableCell className="font-medium">{label}</TableCell>
                    {matrix.roles.map((role) => {
                      const cell = matrix.cells[role][module]
                      return (
                        <TableCell key={role} className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Switch
                              aria-label={`${label} para ${ROLE_LABELS[role as keyof typeof ROLE_LABELS]}`}
                              checked={cell.allowed}
                              disabled={cell.locked || pending === `${role}:${module}`}
                              onCheckedChange={(checked) => toggle(role, module, !!checked)}
                            />
                            <Badge variant={cell.overridden ? "warning" : "outline"} className="text-[10px]">
                              {cell.locked ? SOURCE_TEXT.owner : cell.overridden ? SOURCE_TEXT[cell.source] : SOURCE_TEXT.default}
                            </Badge>
                          </div>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
          </TabsContent>
          <TabsContent value="persona" className="pt-4">
            <PermissionsByPerson />
          </TabsContent>
        </Tabs>
      </CardContent>

      <AlertDialog open={!!resetRole} onOpenChange={(open) => !open && setResetRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restablecer los permisos?</AlertDialogTitle>
            <AlertDialogDescription>
              {resetRole && `El rol ${ROLE_LABELS[resetRole as keyof typeof ROLE_LABELS]} vuelve a los permisos ${companyId ? "globales" : "por defecto"}. Se quitan sus ${customized(resetRole)} cambios ${companyId ? "de esta empresa" : "globales"}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Restablecer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
