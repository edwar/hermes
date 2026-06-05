"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface CashRegisterFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  edit?: { id: string; name: string; isActive: boolean } | null
}

export function CashRegisterForm({ open, onOpenChange, edit }: CashRegisterFormProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [name, setName] = useState("")

  useEffect(() => {
    if (open) setName(edit?.name ?? "")
  }, [open, edit])

  const createMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await fetch("/api/cash-registers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Error al crear caja") }
      return res.json()
    },
    onSuccess: () => {
      toast.success("Caja creada exitosamente")
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] })
      onOpenChange(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string }) => {
      const res = await fetch(`/api/cash-registers/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Error al actualizar caja") }
      return res.json()
    },
    onSuccess: () => {
      toast.success("Caja actualizada exitosamente")
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] })
      onOpenChange(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("El nombre es requerido")
      return
    }
    if (edit) {
      updateMutation.mutate({ id: edit.id, name: name.trim() })
    } else {
      createMutation.mutate({ name: name.trim() })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isPending) onOpenChange(v) }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{edit ? "Editar caja" : "Nueva caja"}</DialogTitle>
          <DialogDescription>
            {edit ? "Cambia el nombre de la caja registradora" : "Agrega una nueva caja registradora"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Caja Principal"
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending} className="w-full sm:w-auto">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim()} className="w-full sm:w-auto">
            {isPending ? <><Loader2 className="mr-2 size-4 animate-spin" /> Guardando...</> : (edit ? "Guardar" : "Crear")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
