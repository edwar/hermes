"use client"

import { useState, useEffect } from "react"
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
  onConflict?: (info: { sessionId: string; activeUser?: string; activeDevice?: string }) => void
}

function generateDeviceId(): string {
  const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`
  const nav = `${navigator.userAgent.substring(0, 50)}`
  const time = new Date().getTimezoneOffset()
  return btoa(`${screen}|${nav}|${time}`).substring(0, 32)
}

function getDeviceName(): string {
  const platform = navigator.platform || "Unknown"
  const cpuCores = navigator.hardwareConcurrency || "? CPUs"
  return `${platform} (${cpuCores} cores)`
}

async function fetchRegisters() {
  const res = await fetch("/api/cash-registers")
  if (!res.ok) throw new Error("Error al cargar cajas")
  return res.json()
}

async function openSession(data: { cashRegisterId: string; openingBalance: number; deviceId: string; deviceName: string }) {
  const res = await fetch("/api/cash-sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    const error = new Error(err.error ?? "Error al abrir caja")
    ;(error as any).activeUser = err.activeUser
    ;(error as any).activeDevice = err.activeDevice
    throw error
  }
  return res.json()
}

export function OpenSessionDialog({ open, onOpenChange, onSuccess, onConflict }: OpenSessionDialogProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [registerId, setRegisterId] = useState("")
  const [baseAmount, setBaseAmount] = useState("")
  const [deviceId] = useState(() => generateDeviceId())
  const [deviceName] = useState(() => getDeviceName())

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
      const errorMsg = err.message
      const activeUser = (err as any).activeUser
      const activeDevice = (err as any).activeDevice
      
      if (errorMsg.includes("ya está abierta") || errorMsg.includes("dispositivo")) {
        if (onConflict) {
          onConflict({ sessionId: `conflict-${Date.now()}`, activeUser, activeDevice })
          return
        }
      }
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
    mutation.mutate({ cashRegisterId: registerId, openingBalance: amount, deviceId, deviceName })
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
