"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
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
import { Separator } from "@/components/ui/separator"
import { formatCOP } from "@/lib/utils"
import { TAX_RATE, PAYMENT_METHOD } from "@/lib/constants"
import { Receipt } from "@/components/pos/receipt"
import { CustomerLookup } from "@/components/pos/customer-lookup"
import { usePrinter } from "@/hooks/use-printer"
import { useSettings } from "@/hooks/use-settings"
import { getPrintMethod } from "@/lib/print/print-service"
import { Banknote, CreditCard, Landmark, Wallet, Printer, Loader2, Eraser } from "lucide-react"
import type { CartItem } from "@/features/pos/types"

interface CashDenomination {
  id: string
  value: number
  label: string
  sortOrder: number
  isActive: boolean
}

async function cachedFetchDenominations(companyId: string): Promise<CashDenomination[]> {
  try {
    const res = await fetch("/api/cash-denominations")
    if (res.ok) {
      const data: CashDenomination[] = await res.json()
      return data
    }
  } catch {
    // fallback
  }
  const { db } = await import("@/lib/db")
  const cached = await db.cachedDenominations
    .where("companyId")
    .equals(companyId)
    .filter((d) => d.isActive)
    .sortBy("sortOrder")
  return cached.map((d) => ({
    id: d.id,
    value: Number(d.value),
    label: d.label,
    sortOrder: d.sortOrder,
    isActive: d.isActive,
  }))
}

const paymentMethods = [
  { value: PAYMENT_METHOD.CASH, label: "Efectivo", icon: Banknote },
  { value: PAYMENT_METHOD.CARD, label: "Tarjeta", icon: CreditCard },
  { value: PAYMENT_METHOD.CREDIT, label: "Crédito", icon: Wallet },
  { value: PAYMENT_METHOD.TRANSFER, label: "Transferencia", icon: Landmark },
]

interface CustomerInfo {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  cedula?: string | null
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
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD]>(PAYMENT_METHOD.CASH)
  const [amountReceived, setAmountReceived] = useState("")
  const [showReceipt, setShowReceipt] = useState(false)
  const { data: session } = useSession()
  const companyId = session?.user?.companyId
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerInfo | null>(null)
  const [requestElectronicInvoice, setRequestElectronicInvoice] = useState(false)
  const { print: printReceipt, isPrinting } = usePrinter()
  const { settings } = useSettings()

  const { data: denominations } = useQuery({
    queryKey: ["cash-denominations", companyId],
    queryFn: () => cachedFetchDenominations(companyId!),
    enabled: open && !!companyId,
  })

  useEffect(() => {
    if (preSelectedCustomer) {
      setSelectedCustomer(preSelectedCustomer)
      onPreSelectedCustomerConsumed?.()
    }
  }, [preSelectedCustomer, onPreSelectedCustomerConsumed])

  useEffect(() => {
    // Reset state when modal opens for a new sale
    if (open && !saleResult) {
      setPaymentMethod(PAYMENT_METHOD.CASH)
      setAmountReceived("")
      setShowReceipt(false)
      setRequestElectronicInvoice(false)
      if (!preSelectedCustomer) {
        setSelectedCustomer(null)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, saleResult])

  function addDenomination(value: number) {
    setAmountReceived((prev) => {
      const digits = prev.replace(/\D/g, "")
      const current = parseFloat(digits || "0")
      return String(current + value)
    })
  }

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
      <DialogContent className="sm:max-w-xl p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-0 shrink-0">
          <DialogTitle className="text-base">Finalizar venta</DialogTitle>
          <DialogDescription className="text-xs">
            Selecciona el método de pago y confirma la venta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-4 py-3">
          <CustomerLookup
            selectedCustomer={selectedCustomer}
            onCustomerSelect={setSelectedCustomer}
            onRequestElectronicInvoiceChange={setRequestElectronicInvoice}
            requestElectronicInvoice={requestElectronicInvoice}
            onRequestCreateCustomer={onRequestCreateCustomer}
            onRequestEditCustomer={onRequestEditCustomer}
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-3 min-w-0">
              {paymentMethod === PAYMENT_METHOD.CASH && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Monto recibido</Label>
                    <CurrencyInput
                      id="amount"
                      value={amountReceived}
                      onChange={setAmountReceived}
                      placeholder={`Mínimo ${formatCOP(total)}`}
                      className="h-9 text-sm"
                    />
                  </div>

                  {denominations && denominations.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Denominaciones</Label>
                      <div className="flex flex-wrap gap-1">
                        {denominations.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => addDenomination(Number(d.value))}
                            className="rounded-md border bg-card px-2 py-1 text-[11px] font-mono font-medium tabular-nums transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95"
                          >
                            {d.label}
                          </button>
                        ))}
                        {amountReceived && (
                          <button
                            type="button"
                            onClick={() => setAmountReceived("")}
                            className="rounded-md border border-dashed bg-card px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted active:scale-95"
                          >
                            <Eraser className="inline size-2.5 mr-0.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="rounded-lg bg-muted p-3 space-y-1 text-xs">
                <div className="flex justify-between gap-2 text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">{formatCOP(subtotal)}</span>
                </div>
                <div className="flex justify-between gap-2 text-muted-foreground">
                  <span>IVA ({(TAX_RATE * 100).toFixed(0)}%)</span>
                  <span className="font-mono tabular-nums">{formatCOP(tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between gap-2 font-semibold">
                  <span>Total</span>
                  <span className="font-mono tabular-nums">{formatCOP(total)}</span>
                </div>
                {paymentMethod === PAYMENT_METHOD.CASH && (
                  <>
                    <Separator />
                    <div className="flex justify-between gap-2 text-muted-foreground">
                      <span>Recibido</span>
                      <span className="font-mono tabular-nums">{formatCOP(parseFloat(amountReceived || "0"))}</span>
                    </div>
                    {parseFloat(amountReceived || "0") >= total && (
                      <div className="flex justify-between gap-2 font-semibold text-success">
                        <span>Cambio</span>
                        <span className="font-mono tabular-nums">{formatCOP(change)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs">Método de pago</Label>
              <div className="grid grid-cols-2 gap-1.5 max-h-[120px] overflow-y-auto">
                {paymentMethods.map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    variant={paymentMethod === value ? "default" : "outline"}
                    className="h-10 flex-col gap-0.5"
                    onClick={() => {
                      setPaymentMethod(value)
                      setAmountReceived("")
                    }}
                  >
                    <Icon className="size-4" />
                    <span className="text-[10px] leading-tight">{label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-1.5 sm:flex-row mx-0 mb-0 rounded-none border-t bg-background px-4 pb-4 pt-3 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={isProcessing || (paymentMethod === PAYMENT_METHOD.CASH && parseFloat(amountReceived || "0") < total)}
            className="w-full sm:w-auto"
          >
            {isProcessing ? "Procesando..." : <>Confirmar <span className="font-mono ml-1">{formatCOP(total)}</span></>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
