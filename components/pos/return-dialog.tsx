"use client"

import { useState, useEffect, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { formatCOP } from "@/lib/utils"
import { Search, RotateCcw, Minus, Plus, Loader2, Zap } from "lucide-react"
import { sileo } from "sileo"

interface ReturnItem {
  productId: string
  productName: string
  quantity: number
  maxQuantity: number
  unitPrice: number
  subtotal: number
}

export function ReturnDialog({ open, onOpenChange, initialSaleId }: { open: boolean; onOpenChange: (v: boolean) => void; initialSaleId?: string }) {
  const [searchId, setSearchId] = useState(initialSaleId ?? "")
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([])
  const [reason, setReason] = useState("")
  const [selectedSale, setSelectedSale] = useState<any>(null)
  const [searchError, setSearchError] = useState("")
  const [createCreditNote, setCreateCreditNote] = useState(false)
  const initialSearchDone = useRef(false)

  useEffect(() => {
    if (open && initialSaleId && !initialSearchDone.current) {
      initialSearchDone.current = true
      searchMutation.mutate(initialSaleId)
    }
  }, [open, initialSaleId])

  const searchMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sales/${id}?includeElectronicInvoice=true`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Venta no encontrada")
      }
      return res.json()
    },
    onSuccess: (sale) => {
      if (sale.isReturn) {
        setSearchError("No se puede devolver una devolución")
        return
      }
      setSelectedSale(sale)
      setSearchError("")
      setReturnItems(
        sale.items.map((item: any) => ({
          productId: item.productId,
          productName: item.product.name,
          quantity: 0,
          maxQuantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: 0,
        }))
      )
    },
    onError: (err: Error) => {
      setSearchError(err.message)
      setSelectedSale(null)
      setReturnItems([])
    },
  })

  const returnMutation = useMutation({
    mutationFn: async () => {
      const items = returnItems
        .filter((i) => i.quantity > 0)
        .map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.unitPrice * i.quantity,
        }))

      const res = await fetch("/api/sales/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: selectedSale.id,
          items,
          reason,
          createCreditNote: selectedSale?.electronicInvoice ? createCreditNote : false,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al procesar devolución")
      }
      return res.json()
    },
    onSuccess: () => {
      sileo.success({ title: "Devolución procesada exitosamente" })
      handleClose()
    },
    onError: (err: Error) => {
      sileo.error({ title: err.message })
    },
  })

  const handleClose = () => {
    setSearchId("")
    setSelectedSale(null)
    setReturnItems([])
    setReason("")
    setSearchError("")
    setCreateCreditNote(false)
    initialSearchDone.current = false
    onOpenChange(false)
  }

  const updateQuantity = (productId: string, delta: number) => {
    setReturnItems((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item
        const newQty = Math.max(0, Math.min(item.maxQuantity, item.quantity + delta))
        return { ...item, quantity: newQty, subtotal: newQty * item.unitPrice }
      })
    )
  }

  const totalReturn = returnItems.reduce((acc, i) => acc + i.subtotal, 0)
  const hasItems = returnItems.some((i) => i.quantity > 0)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Devolución</DialogTitle>
        </DialogHeader>

        {!selectedSale ? (
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sale-search">Buscar venta por ID</Label>
              <div className="flex gap-2 p-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="sale-search"
                    placeholder="ID de la venta"
                    className="pl-8"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchId.trim()) {
                        searchMutation.mutate(searchId.trim())
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={() => searchMutation.mutate(searchId.trim())}
                  disabled={!searchId.trim() || searchMutation.isPending}
                >
                  {searchMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                  Buscar
                </Button>
              </div>
              {searchError && <p className="text-sm text-destructive">{searchError}</p>}
            </div>
          </div>
        ) : (
          <div className="flex flex-col min-h-0 flex-1">
            <div className="flex-shrink-0 rounded-lg border p-3 text-sm mb-3">
              <p>
                <span className="text-muted-foreground">Venta:</span>{" "}
                <span className="font-medium">{selectedSale.id.slice(0, 8)}...</span>
              </p>
              <p>
                <span className="text-muted-foreground">Fecha:</span>{" "}
                {new Date(selectedSale.createdAt).toLocaleDateString("es-CO", {
                  dateStyle: "long",
                })}
              </p>
              <p>
                <span className="text-muted-foreground">Total:</span>{" "}
                <span className="font-mono">{formatCOP(Number(selectedSale.total))}</span>
              </p>
            </div>

            <div className="flex-shrink-0 max-h-48 overflow-y-auto border rounded-lg">
              <div className="p-2 space-y-2">
                {returnItems.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3 rounded-lg border p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{formatCOP(item.unitPrice)}</span> c/u
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => updateQuantity(item.productId, -1)}
                      >
                        <Minus className="size-2.5" />
                      </Button>
                      <span className="flex h-6 w-7 items-center justify-center text-xs font-medium font-mono tabular-nums">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => updateQuantity(item.productId, 1)}
                      >
                        <Plus className="size-2.5" />
                      </Button>
                    </div>
                    <div className="w-16 text-right text-xs font-mono tabular-nums">
                      {formatCOP(item.subtotal)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-shrink-0 flex justify-between text-base font-bold mt-3">
              <span>Total a devolver</span>
              <span className="font-mono tabular-nums">{formatCOP(totalReturn)}</span>
            </div>

            {selectedSale?.electronicInvoice && (
              <div className="flex-shrink-0 flex items-center space-x-2 rounded-lg border border-amber-200 bg-amber-50 p-2 mt-3">
                <Checkbox
                  id="createCreditNote"
                  checked={createCreditNote}
                  onCheckedChange={(checked) => setCreateCreditNote(checked === true)}
                />
                <div className="space-y-0.5 leading-none">
                  <Label htmlFor="createCreditNote" className="text-xs font-medium cursor-pointer flex items-center gap-1">
                    <Zap className="size-3 text-amber-600" />
                    Nota crédito DIAN
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    {formatCOP(totalReturn)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex-shrink-0 space-y-1.5 mt-3">
              <Label htmlFor="return-reason" className="text-xs">Motivo</Label>
              <Input
                id="return-reason"
                placeholder="Opcional"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          {selectedSale && (
            <Button
              onClick={() => returnMutation.mutate()}
              disabled={!hasItems || returnMutation.isPending}
            >
              {returnMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 size-4" />
              )}
              Procesar devolución
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
