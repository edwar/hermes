"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
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
import { useSuppliers } from "@/features/suppliers/hooks/use-suppliers"
import { useProducts } from "@/features/inventory/hooks/use-products"
import { useCreatePurchaseOrder } from "@/features/purchase-orders/hooks/use-purchase-orders"
import { formatCOP } from "@/lib/utils"
import { Plus, Trash2, Loader2 } from "lucide-react"

interface PurchaseOrderFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface OrderItem {
  productId: string
  productName: string
  quantity: number
  purchasePrice: number
}

export function PurchaseOrderForm({ open, onOpenChange, onSuccess }: PurchaseOrderFormProps) {
  const { data: suppliersData } = useSuppliers({ includeInactive: true })
  const { data: productsData } = useProducts({ pageSize: 100 })
  const createOrder = useCreatePurchaseOrder()

  const [supplierId, setSupplierId] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<OrderItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [quantity, setQuantity] = useState("1")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [loading, setLoading] = useState(false)

  const suppliers = suppliersData?.suppliers ?? []
  const products = productsData?.products ?? []

  const total = items.reduce((sum, item) => sum + item.purchasePrice * item.quantity, 0)

  useEffect(() => {
    if (open) {
      setSupplierId("")
      setNotes("")
      setItems([])
      setSelectedProductId("")
      setQuantity("1")
      setPurchasePrice("")
    }
  }, [open])

  function addItem() {
    if (!selectedProductId || !quantity || !purchasePrice) return
    const product = products.find((p: any) => p.id === selectedProductId)
    if (!product) return

    const existing = items.find((i) => i.productId === selectedProductId)
    if (existing) {
      setItems(items.map((i) =>
        i.productId === selectedProductId
          ? { ...i, quantity: i.quantity + parseInt(quantity), purchasePrice: parseFloat(purchasePrice) }
          : i
      ))
    } else {
      setItems([
        ...items,
        {
          productId: selectedProductId,
          productName: product.name,
          quantity: parseInt(quantity),
          purchasePrice: parseFloat(purchasePrice),
        },
      ])
    }
    setSelectedProductId("")
    setQuantity("1")
    setPurchasePrice("")
  }

  function removeItem(productId: string) {
    setItems(items.filter((i) => i.productId !== productId))
  }

  function handleProductSelect(productId: string | null) {
    if (!productId) return
    setSelectedProductId(productId)
    const product = products.find((p: any) => p.id === productId)
    if (product) {
      setPurchasePrice(String(product.purchasePrice))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierId || items.length === 0) return

    setLoading(true)
    try {
      await createOrder.mutateAsync({
        supplierId,
        notes: notes || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
        })),
      })
      onOpenChange(false)
      onSuccess?.()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Pedido a Proveedor</DialogTitle>
          <DialogDescription>
            Registra un nuevo pedido de compra
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Proveedor *</Label>
            <Select value={supplierId} onValueChange={(v) => setSupplierId(v || "")}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proveedor" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales (opcional)"
            />
          </div>

          <div className="space-y-2">
            <Label>Agregar productos</Label>
            <div className="flex gap-2">
              <Select value={selectedProductId} onValueChange={handleProductSelect}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-20"
                placeholder="Cant"
              />
              <CurrencyInput
                value={purchasePrice}
                onChange={setPurchasePrice}
                className="w-28"
                placeholder="P. Compra"
              />
              <Button type="button" variant="outline" onClick={addItem} disabled={!selectedProductId || !quantity || !purchasePrice}>
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          {items.length > 0 && (
            <div className="rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-medium">Producto</th>
                    <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                    <th className="px-3 py-2 text-right font-medium">P. Compra</th>
                    <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.productId} className="border-b">
                      <td className="px-3 py-2 font-medium">{item.productName}</td>
                      <td className="px-3 py-2 text-right font-mono">{item.quantity}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCOP(item.purchasePrice)}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCOP(item.purchasePrice * item.quantity)}</td>
                      <td className="px-3 py-2">
                        <Button type="button" variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => removeItem(item.productId)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-lg bg-muted p-3">
            <div className="flex justify-between text-lg font-bold">
              <span>Total del pedido:</span>
              <span className="font-mono tabular-nums">{formatCOP(total)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !supplierId || items.length === 0}>
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Crear Pedido
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
