"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api-client"
import { Plus, Pencil, Users } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { USER_ROLE } from "@/lib/constants"

interface UserForm {
  id?: string
  name: string
  email: string
  password: string
  role: string
}

const ROLE_LABELS: Record<string, string> = {
  [USER_ROLE.OWNER]: "Dueño",
  [USER_ROLE.ADMIN]: "Gerente",
  [USER_ROLE.MANAGER]: "Gestor",
  [USER_ROLE.CASHIER]: "Cajero",
  [USER_ROLE.GOD]: "Super Admin",
}

function createEmptyForm(): UserForm {
  return { name: "", email: "", password: "", role: "" }
}

async function fetchUsers() {
  const res = await fetch("/api/users")
  if (!res.ok) throw new Error("Error al cargar usuarios")
  return res.json()
}

async function fetchCompany() {
  const res = await fetch("/api/settings")
  if (!res.ok) throw new Error("Error al cargar datos de la empresa")
  return res.json() as Promise<{ companyName: string }>
}

export default function UsersPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<UserForm | null>(null)
  const [form, setForm] = useState<UserForm>(createEmptyForm)
  const [loading, setLoading] = useState(false)

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  })

  const { data: company } = useQuery({
    queryKey: ["company-settings"],
    queryFn: fetchCompany,
    staleTime: 1000 * 60 * 5,
  })

  function openCreate() {
    setEditing(null)
    setForm(createEmptyForm())
    setFormOpen(true)
  }

  function openEdit(user: any) {
    setEditing(user)
    setForm({ id: user.id, name: user.name, email: user.email, password: "", role: user.role })
    setFormOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (editing) {
        const result = await apiFetch<Record<string, unknown>>("/api/users", {
          method: "PUT",
          body: { id: editing.id, name: form.name, role: form.role, password: form.password || undefined },
          resource: "users",
          entityId: editing.id,
        })
        if (!result.ok) throw new Error(result.error)
        const queued = (result.queued ? result.mock : result.data) as { _queued?: boolean }
        toast.success(queued._queued ? "Cambios encolados: se sincronizarán al reconectar" : "Usuario actualizado")
      } else {
        const result = await apiFetch<Record<string, unknown>>("/api/users", {
          method: "POST",
          body: { name: form.name, email: form.email, password: form.password, role: form.role },
          resource: "users",
        })
        if (!result.ok) throw new Error(result.error)
        const queued = (result.queued ? result.mock : result.data) as { _queued?: boolean }
        toast.success(queued._queued ? "Usuario encolado: se creará al reconectar" : "Usuario creado")
      }
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setFormOpen(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Usuarios</h2>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Nuevo Usuario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestión de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="w-20 text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : users?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      <Users className="mx-auto size-8" />
                      <p className="mt-1">No hay usuarios registrados</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  users?.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === USER_ROLE.GOD ? "default" : user.role === USER_ROLE.ADMIN ? "default" : "secondary"}>
                          {user.role === USER_ROLE.GOD ? "Super Admin" : user.role === USER_ROLE.OWNER ? "Dueño" : user.role === USER_ROLE.ADMIN ? "Gerente" : user.role === USER_ROLE.MANAGER ? "Gestor" : "Cajero"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "outline" : "secondary"} className={
                          user.isActive ? "bg-green-100 text-green-700 border-green-200" : ""
                        }>
                          {user.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                          <Pencil className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
            <DialogDescription>
              {editing ? "Modifica los datos del usuario" : "Crea un nuevo usuario para el sistema"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="u-name">Nombre *</Label>
              <Input id="u-name" placeholder="Nombre completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoComplete="hermes-name" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="u-email">Email *</Label>
                {company?.companyName && (
                  <span className="text-xs text-muted-foreground">
                    ej. user@{company.companyName.toLowerCase().replace(/\s+/g, "")}.com
                  </span>
                )}
              </div>
              <Input id="u-email" type="email" placeholder="correo@empresa.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!editing} autoComplete="hermes-email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-pass">{editing ? "Nueva contraseña (dejar vacío para mantener)" : "Contraseña *"}</Label>
              <Input id="u-pass" type="password" placeholder="********" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} autoComplete="new-password" />
            </div>
            <div className="space-y-2">
              <Label>Rol *</Label>
              <Select key={editing ? `edit-${editing.id}` : "create"} value={form.role} onValueChange={(v) => setForm({ ...form, role: v ?? "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol">
                    {form.role ? ROLE_LABELS[form.role] ?? form.role : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={USER_ROLE.OWNER}>Dueño</SelectItem>
                  <SelectItem value={USER_ROLE.ADMIN}>Gerente</SelectItem>
                  <SelectItem value={USER_ROLE.MANAGER}>Gestor</SelectItem>
                  <SelectItem value={USER_ROLE.CASHIER}>Cajero</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
