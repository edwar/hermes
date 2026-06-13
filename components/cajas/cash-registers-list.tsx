"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api-client"
import { CashRegisterForm } from "./cash-register-form"
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react"
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

async function fetchRegisters() {
  const res = await fetch("/api/cash-registers")
  if (!res.ok) throw new Error("Error al cargar cajas")
  return res.json()
}

export function CashRegistersList() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [editRegister, setEditRegister] = useState<{ id: string; name: string; isActive: boolean } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: registers, isLoading } = useQuery({
    queryKey: ["cash-registers"],
    queryFn: fetchRegisters,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await apiFetch<Record<string, unknown>>(`/api/cash-registers/${id}`, {
        method: "DELETE",
        resource: "cash-registers",
        entityId: id,
        mockResponse: (_body, cid) => ({ id, clientId: cid, deleted: true }),
      })
      if (!result.ok) throw new Error(result.error)
      return result.queued ? result.mock : result.data
    },
    onSuccess: (data) => {
      const queued = (data as { _queued?: boolean })._queued
      toast.success(queued ? "Eliminación encolada: se aplicará al reconectar" : "Caja eliminada")
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] })
      setDeleteId(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function handleEdit(r: { id: string; name: string; isActive: boolean }) {
    setEditRegister(r)
    setFormOpen(true)
  }

  const list = Array.isArray(registers) ? registers : []

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium">Cajas registradoras</h3>
        <Button size="sm" onClick={() => { setEditRegister(null); setFormOpen(true) }}>
          <Plus className="mr-1.5 size-4" /> Nueva caja
        </Button>
      </div>

      <div className="rounded-lg border">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : list.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">No hay cajas registradoras</p>
        ) : (
          <div className="divide-y">
            {list.map((r: { id: string; name: string; isActive: boolean }) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{r.name}</span>
                  {!r.isActive && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Inactiva</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEdit(r)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setDeleteId(r.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CashRegisterForm open={formOpen} onOpenChange={setFormOpen} edit={editRegister} />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar caja?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Si la caja tiene sesiones asociadas, no podrá eliminarse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
