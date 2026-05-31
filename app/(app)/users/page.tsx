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
import { Plus, Pencil, Users } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface UserForm {
  id?: string
  name: string
  email: string
  password: string
  role: string
}

const emptyForm: UserForm = { name: "", email: "", password: "", role: "CASHIER" }

async function fetchUsers() {
  const res = await fetch("/api/users")
  if (!res.ok) throw new Error("Error al cargar usuarios")
  return res.json()
}

async function createUser(data: { name: string; email: string; password: string; role: string }) {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message ?? "Error al crear usuario")
  }
  return res.json()
}

async function updateUser(data: any) {
  const res = await fetch("/api/users", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Error al actualizar usuario")
  return res.json()
}

export default function UsersPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<UserForm | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [loading, setLoading] = useState(false)

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  })

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
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
        await updateUser({ id: editing.id, name: form.name, role: form.role, password: form.password || undefined })
        toast.success("Usuario actualizado")
      } else {
        await createUser({ name: form.name, email: form.email, password: form.password, role: form.role })
        toast.success("Usuario creado")
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
                        <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                          {user.role === "ADMIN" ? "Admin" : "Cajero"}
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
              <Input id="u-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-email">Email *</Label>
              <Input id="u-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!editing} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-pass">{editing ? "Nueva contraseña (dejar vacío para mantener)" : "Contraseña *"}</Label>
              <Input id="u-pass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
            </div>
            <div className="space-y-2">
              <Label>Rol *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v ?? "" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="CASHIER">Cajero</SelectItem>
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
