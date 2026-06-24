"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useCreateStockMovement } from "@/features/inventory/hooks/use-stock-movements"
import { useProducts } from "@/features/inventory/hooks/use-products"
import { Loader2 } from "lucide-react"
import { STOCK_MOVEMENT_TYPE } from "@/lib/constants"

interface StockMovementFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StockMovementForm({ open, onOpenChange }: StockMovementFormProps) {
  const [type, setType] = useState<"IN" | "OUT">(STOCK_MOVEMENT_TYPE.IN)
  const [productId, setProductId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const { data: productsData } = useProducts({ pageSize: 200 })
  const createMovement = useCreateStockMovement()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await createMovement.mutateAsync({
      type,
      productId,
      quantity: parseInt(quantity),
      reason: reason || undefined,
    })
    setType(STOCK_MOVEMENT_TYPE.IN)
    setProductId("")
    setQuantity("")
    setReason("")
    onOpenChange(false)
  }

  const products = productsData?.products ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Movimiento</DialogTitle>
          <DialogDescription>
            Registra una entrada o salida de stock
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de movimiento</Label>
            <Select value={type} onValueChange={(v) => setType((v ?? "IN") as "IN" | "OUT")}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={STOCK_MOVEMENT_TYPE.IN}>Entrada</SelectItem>
                <SelectItem value={STOCK_MOVEMENT_TYPE.OUT}>Salida</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="product">Producto</Label>
            <Select value={productId} onValueChange={(v) => setProductId(v ?? "")}>
              <SelectTrigger id="product">
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.stock} uds.)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Ajuste de inventario"
            />
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" disabled={createMovement.isPending || !productId || !quantity} className="w-full sm:w-auto">
              {createMovement.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                "Registrar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
