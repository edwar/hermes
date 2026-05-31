"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Pagination } from "@/components/ui/pagination"
import { useCustomers, useDeleteCustomer } from "@/features/inventory/hooks/use-customers"
import { CustomerForm } from "@/components/inventory/customer-form"
import { Plus, Search, Pencil, Trash2, Users, Mail, Phone, MapPin } from "lucide-react"

export function CustomersTable() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useCustomers({ search: debouncedSearch, page, pageSize: 20 })
  const deleteCustomer = useDeleteCustomer()
  const customers = data?.customers ?? []

  function handleEdit(customer: any) {
    setEditingCustomer(customer)
    setFormOpen(true)
  }

  function handleCreate() {
    setEditingCustomer(null)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o teléfono..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); setTimeout(() => setDebouncedSearch(e.target.value), 300) }}
            className="h-10 pl-10"
          />
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 size-4" />
          Nuevo Cliente
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="size-12 text-muted-foreground/40" />
          <p className="mt-4 text-sm font-medium text-muted-foreground">Sin clientes</p>
          <p className="text-xs text-muted-foreground/60">Registra tu primer cliente</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Mail className="size-3" /> {c.email}
                        </div>
                      )}
                      {c.phone && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="size-3" /> {c.phone}
                        </div>
                      )}
                      {!c.email && !c.phone && <span className="text-sm text-muted-foreground/50">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.address ? (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="size-3 shrink-0" /> {c.address}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString("es")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEdit(c)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination
        page={data?.page ?? 1}
        pages={data?.pages ?? 1}
        total={data?.total}
        onPageChange={setPage}
      />

      <CustomerForm open={formOpen} onOpenChange={setFormOpen} customer={editingCustomer} />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El cliente será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
              onClick={() => {
                if (deleteId) deleteCustomer.mutate(deleteId)
                setDeleteId(null)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
