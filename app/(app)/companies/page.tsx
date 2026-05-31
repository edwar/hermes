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
import { useToast } from "@/hooks/use-toast"
import { Building2, Pencil, Search, Trash2 } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface CompanyForm {
  id?: string
  name: string
  nit: string
  address: string
  phone: string
  email: string
}

const emptyForm: CompanyForm = { name: "", nit: "", address: "", phone: "", email: "" }

async function fetchCompanies(search?: string) {
  const url = search ? `/api/companies?search=${encodeURIComponent(search)}` : "/api/companies"
  const res = await fetch(url)
  if (!res.ok) throw new Error("Error al cargar empresas")
  return res.json()
}

async function updateCompany(data: CompanyForm) {
  const res = await fetch("/api/companies", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || "Error al actualizar empresa")
  }
  return res.json()
}

async function deleteCompany(id: string) {
  const res = await fetch(`/api/companies?id=${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Error al eliminar empresa")
  return res.json()
}

export default function CompaniesPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState<CompanyForm>(emptyForm)
  const [loading, setLoading] = useState(false)

  const { data: companies, isLoading } = useQuery({
    queryKey: ["companies", search],
    queryFn: () => fetchCompanies(search),
  })

  function openEdit(company: any) {
    setEditing(company)
    setForm({
      id: company.id,
      name: company.name,
      nit: company.nit || "",
      address: company.address || "",
      phone: company.phone || "",
      email: company.email || "",
    })
    setFormOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await updateCompany(form)
      toast.success("Empresa actualizada")
      queryClient.invalidateQueries({ queryKey: ["companies"] })
      setFormOpen(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteCompany(deleteId)
      toast.success("Empresa desactivada")
      queryClient.invalidateQueries({ queryKey: ["companies"] })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Empresas</h2>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gestión de Empresas</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>NIT</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Usuarios</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead className="w-20 text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : companies?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      <Building2 className="mx-auto size-8" />
                      <p className="mt-1">No hay empresas registradas</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  companies?.map((company: any) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell className="text-muted-foreground">{company.nit || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{company.email || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{company.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{company._count?.users || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={company.isActive ? "bg-green-100 text-green-700 border-green-200" : ""}>
                          {company.isActive ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(company.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(company)}>
                            <Pencil className="size-4" />
                          </Button>
                          {company.isActive && (
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(company.id)}>
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          )}
                        </div>
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
            <DialogTitle>Editar Empresa</DialogTitle>
            <DialogDescription>
              Modifica los datos de la empresa
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="c-name">Nombre *</Label>
              <Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-nit">NIT</Label>
              <Input id="c-nit" value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-email">Email</Label>
              <Input id="c-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-phone">Teléfono</Label>
              <Input id="c-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-address">Dirección</Label>
              <Input id="c-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará la empresa. Los datos no se perderán, pero la empresa no podrá usar el sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
