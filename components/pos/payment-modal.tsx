"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatCOP } from "@/lib/utils"
import { TAX_RATE } from "@/lib/constants"
import { Receipt } from "@/components/pos/receipt"
import { CustomerLookup } from "@/components/pos/customer-lookup"
import { usePrinter } from "@/hooks/use-printer"
import { useSettings } from "@/hooks/use-settings"
import { getPrintMethod } from "@/lib/print/print-service"
import { Banknote, CreditCard, Landmark, Wallet, Printer, Loader2 } from "lucide-react"
import type { CartItem } from "@/features/pos/types"

const paymentMethods = [
  { value: "CASH", label: "Efectivo", icon: Banknote },
  { value: "CARD", label: "Tarjeta", icon: CreditCard },
  { value: "TRANSFER", label: "Transferencia", icon: Landmark },
  { value: "CREDIT", label: "Crédito", icon: Wallet },
]

interface CustomerInfo {
  id: string
  name: string
  email?: string | null
}

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
  onConfirm: (data: {
    items: CartItem[]
    subtotal: number
    tax: number
    total: number
    paymentMethod: string
    customerId?: string
    customerName?: string
    requestElectronicInvoice?: boolean
  }) => void
  isProcessing: boolean
  saleResult: any
  onNewSale: () => void
  onRequestCreateCustomer: (data: { cedula: string }) => void
  onRequestEditCustomer: (customer: CustomerInfo & { email?: string | null; phone?: string | null; address?: string | null; cedula?: string | null }) => void
  preSelectedCustomer?: CustomerInfo | null
  onPreSelectedCustomerConsumed?: () => void
}

export function PaymentModal({
  open,
  onOpenChange,
  items,
  subtotal,
  tax,
  total,
  onConfirm,
  isProcessing,
  saleResult,
  onNewSale,
  onRequestCreateCustomer,
  onRequestEditCustomer,
  preSelectedCustomer,
  onPreSelectedCustomerConsumed,
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [amountReceived, setAmountReceived] = useState("")
  const [showReceipt, setShowReceipt] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerInfo | null>(null)
  const [requestElectronicInvoice, setRequestElectronicInvoice] = useState(false)
  const { print: printReceipt, isPrinting } = usePrinter()
  const { settings } = useSettings()

  useEffect(() => {
    if (preSelectedCustomer) {
      setSelectedCustomer(preSelectedCustomer)
      onPreSelectedCustomerConsumed?.()
    }
  }, [preSelectedCustomer, onPreSelectedCustomerConsumed])

  if (saleResult && showReceipt) {
    const isSilent = getPrintMethod() !== "browser"
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Venta completada</DialogTitle>
            <DialogDescription>
              La venta se ha registrado exitosamente
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <div className="print-area max-w-[80mm] w-full bg-white shadow-lg rounded-lg p-2">
              <Receipt sale={saleResult} customerName={selectedCustomer?.name} />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              onClick={() => printReceipt({
                id: saleResult.id,
                total: Number(saleResult.total),
                subtotal: Number(saleResult.subtotal),
                tax: Number(saleResult.tax),
                discount: Number(saleResult.discount),
                paymentMethod: saleResult.paymentMethod,
                createdAt: saleResult.createdAt,
                items: saleResult.items?.map((i: any) => ({
                  name: i.product.name,
                  quantity: i.quantity,
                  unitPrice: Number(i.unitPrice),
                  subtotal: Number(i.subtotal),
                })) ?? [],
                customerName: selectedCustomer?.name,
                storeSettings: settings ? {
                  storeName: settings.storeName,
                  nit: settings.nit,
                  address: settings.address,
                  phone: settings.phone,
                  email: settings.email,
                  receiptFooter: settings.receiptFooter,
                  taxRate: Number(settings.taxRate),
                  currency: settings.currency,
                } : undefined,
              })}
              disabled={isPrinting}
            >
              {isPrinting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Printer className="mr-2 size-4" />}
              {isSilent ? "Imprimir" : "Imprimir ticket"}
            </Button>
            {isSilent && (
              <Button variant="outline" onClick={() => window.print()}>
                Vista previa
              </Button>
            )}
            <Button variant="ghost" onClick={onNewSale}>
              Nueva venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const change = Math.max(0, parseFloat(amountReceived || "0") - total)

  function handleConfirm() {
    onConfirm({
      items,
      subtotal,
      tax,
      total,
      paymentMethod,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      requestElectronicInvoice,
    })
    setShowReceipt(true)
  }

  return (
    <Dialog
      open={open && !saleResult}
      onOpenChange={(v) => {
        if (!isProcessing) onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finalizar venta</DialogTitle>
          <DialogDescription>
            Selecciona el método de pago y confirma la venta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <CustomerLookup
            onCustomerSelect={setSelectedCustomer}
            onRequestElectronicInvoiceChange={setRequestElectronicInvoice}
            requestElectronicInvoice={requestElectronicInvoice}
            onRequestCreateCustomer={onRequestCreateCustomer}
            onRequestEditCustomer={onRequestEditCustomer}
          />

          <div className="space-y-3">
            <Label>Método de pago</Label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  variant={paymentMethod === value ? "default" : "outline"}
                  className="h-16 flex-col gap-1"
                  onClick={() => {
                    setPaymentMethod(value)
                    setAmountReceived("")
                  }}
                >
                  <Icon className="size-5" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          {paymentMethod === "CASH" && (
            <div className="space-y-2">
              <Label htmlFor="amount">Monto recibido</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder={`Mínimo ${total}`}
              />
            </div>
          )}

          <div className="rounded-lg bg-muted p-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatCOP(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA ({(TAX_RATE * 100).toFixed(0)}%)</span>
                <span className="font-mono tabular-nums">{formatCOP(tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="font-mono tabular-nums">{formatCOP(total)}</span>
              </div>
              {paymentMethod === "CASH" && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Recibido</span>
                    <span className="font-mono tabular-nums">{formatCOP(parseFloat(amountReceived || "0"))}</span>
                  </div>
                  {parseFloat(amountReceived || "0") >= total && (
                    <div className="flex justify-between font-semibold text-green-600">
                      <span>Cambio</span>
                      <span className="font-mono tabular-nums">{formatCOP(change)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || (paymentMethod === "CASH" && parseFloat(amountReceived || "0") < total)}
          >
            {isProcessing ? "Procesando..." : <>Confirmar <span className="font-mono">{formatCOP(total)}</span></>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
