"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

import { Loader2 } from "lucide-react"

interface OpenSessionDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}

async function fetchRegisters() {
  const res = await fetch("/api/cash-registers")
  if (!res.ok) throw new Error("Error al cargar cajas")
  return res.json()
}

async function openSession(data: { cashRegisterId: string; openingBalance: number }) {
  const res = await fetch("/api/cash-sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "Error al abrir caja")
  }
  return res.json()
}

export function OpenSessionDialog({ open, onOpenChange, onSuccess }: OpenSessionDialogProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [registerId, setRegisterId] = useState("")
  const [baseAmount, setBaseAmount] = useState("")

  const { data: registers, isLoading } = useQuery({
    queryKey: ["cash-registers"],
    queryFn: fetchRegisters,
    enabled: open,
  })

  const mutation = useMutation({
    mutationFn: openSession,
    onSuccess: () => {
      toast.success("Caja abierta exitosamente")
      queryClient.invalidateQueries({ queryKey: ["active-session"] })
      queryClient.invalidateQueries({ queryKey: ["cash-sessions"] })
      setRegisterId("")
      setBaseAmount("")
      onSuccess()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  function handleSubmit() {
    if (!registerId) {
      toast.error("Selecciona una caja")
      return
    }
    const amount = parseFloat(baseAmount)
    if (isNaN(amount) || amount < 0) {
      toast.error("Ingresa un monto base válido")
      return
    }
    mutation.mutate({ cashRegisterId: registerId, openingBalance: amount })
  }

  const activeRegisters = Array.isArray(registers) ? registers.filter((r: { isActive: boolean }) => r.isActive) : []

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!mutation.isPending) onOpenChange(v) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Abrir Caja</DialogTitle>
          <DialogDescription>
            Selecciona una caja registradora e ingresa el monto base para iniciar la jornada
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="register">Caja registradora</Label>
            <Select value={registerId} onValueChange={(v) => v && setRegisterId(v)} disabled={isLoading || mutation.isPending}>
              <SelectTrigger id="register">
                <SelectValue placeholder={isLoading ? "Cargando..." : "Seleccionar caja"} />
              </SelectTrigger>
              <SelectContent>
                {activeRegisters.map((r: { id: string; name: string }) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="base">Base inicial (efectivo en caja)</Label>
            <Input
              id="base"
              type="number"
              min="0"
              value={baseAmount}
              onChange={(e) => setBaseAmount(e.target.value)}
              placeholder="$ 0"
              disabled={mutation.isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending || !registerId}>
            {mutation.isPending ? (
              <><Loader2 className="mr-2 size-4 animate-spin" /> Abriendo...</>
            ) : (
              "Abrir Caja"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
