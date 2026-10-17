"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api-client"
import { Loader2, ShieldCheck } from "lucide-react"
import { USER_ROLE, STOCK_MOVEMENT_TYPE } from "@/lib/constants"

interface CashMovementFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  sessionId: string
  onSuccess?: () => void
}

export function CashMovementForm({ open, onOpenChange, sessionId, onSuccess }: CashMovementFormProps) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const toast = useToast()
  const isCashier = session?.user?.role === USER_ROLE.CASHIER
  const [type, setType] = useState<"IN" | "OUT">(STOCK_MOVEMENT_TYPE.OUT)
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [showAdminAuth, setShowAdminAuth] = useState(false)

  const mutation = useMutation({
    mutationFn: async (data: { type: string; amount: number; reason: string; sessionId: string; adminPassword?: string }) => {
      const result = await apiFetch<Record<string, unknown>>("/api/cash-movements", {
        method: "POST",
        body: data,
        resource: "cash-movements",
        entityId: sessionId,
      })
      if (!result.ok) {
        if (result.error.toLowerCase().includes("admin")) {
          setShowAdminAuth(true)
        }
        throw new Error(result.error)
      }
      return result.queued ? result.mock : result.data
    },
    onSuccess: (data) => {
      const queued = (data as { _queued?: boolean })._queued
      toast.success(queued ? "Movimiento encolado: se sincronizará al reconectar" : "Movimiento registrado")
      queryClient.invalidateQueries({ queryKey: ["active-session"] })
      setAmount("")
      setReason("")
      setAdminPassword("")
      setShowAdminAuth(false)
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (err: Error) => {
      toast.error(err.message)
      if (!err.message.includes("admin")) {
        setAdminPassword("")
      }
    },
  })

  function handleSubmit() {
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Ingresa un monto válido mayor a 0")
      return
    }
    if (!reason.trim()) {
      toast.error("La razón es requerida")
      return
    }
    mutation.mutate({
      type,
      amount: parsedAmount,
      reason: reason.trim(),
      sessionId,
      ...(isCashier && { adminPassword }),
    })
  }

  function handleClose() {
    if (!mutation.isPending) {
      setAmount("")
      setReason("")
      setAdminPassword("")
      setShowAdminAuth(false)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Movimiento de caja</DialogTitle>
          <DialogDescription>
            {showAdminAuth
              ? "Ingresa la contraseña de un administrador para autorizar este movimiento"
              : "Registra un ingreso o retiro de efectivo no asociado a una venta"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {showAdminAuth ? (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 space-y-3">
              <div className="flex items-center gap-2 text-warning">
                <ShieldCheck className="size-5" />
                <span className="text-sm font-medium">Autorización requerida</span>
              </div>
              <p className="text-xs text-warning">
                Un cajero necesita autorización de administrador para realizar movimientos de caja.
              </p>
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Contraseña de administrador</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Contraseña de admin"
                  disabled={mutation.isPending}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Tipo de movimiento</Label>
                <Select value={type} onValueChange={(v) => setType(v as "IN" | "OUT")} disabled={mutation.isPending}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={STOCK_MOVEMENT_TYPE.OUT}>Retiro</SelectItem>
                    <SelectItem value={STOCK_MOVEMENT_TYPE.IN}>Ingreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Monto</Label>
                <CurrencyInput
                  id="amount"
                  value={amount}
                  onChange={setAmount}
                  placeholder="$ 0"
                  disabled={mutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Razón</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: Pago de servicios, abastecimiento..."
                  disabled={mutation.isPending}
                />
              </div>

              {isCashier && (
                <div className="rounded-lg border border-dashed border-muted p-3">
                  <p className="text-xs text-muted-foreground">
                    <ShieldCheck className="mr-1 inline size-3" />
                    Este movimiento requiere autorización de un administrador
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="ghost" onClick={handleClose} disabled={mutation.isPending} className="w-full sm:w-auto">
            {showAdminAuth ? "Cancelar" : "Cerrar"}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending || !amount || !reason.trim() || (showAdminAuth && !adminPassword)}
            className="w-full sm:w-auto"
          >
            {mutation.isPending ? (
              <><Loader2 className="mr-2 size-4 animate-spin" /> Registrando...</>
            ) : showAdminAuth ? (
              "Autorizar y registrar"
            ) : (
              "Registrar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
