"use client"

import { useEffect, useRef } from "react"
import { Receipt } from "@/components/pos/receipt"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Printer, Copy } from "lucide-react"

interface SaleDetailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sale: any
}

export function SaleDetail({ open, onOpenChange, sale }: SaleDetailProps) {
  const printRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    const printWindow = window.open("", "_blank")
    if (!printWindow || !printRef.current) return

    const receiptHtml = printRef.current.innerHTML
    printWindow.document.write(`
      <html><head>
        <title>Ticket #${sale.localId ?? sale.id.slice(0, 8)}</title>
        <style>
          @page { size: 80mm; margin: 0; }
          body { margin: 0; padding: 5mm; font-size: 12px; font-family: 'Courier New', monospace; color: black; background: white; width: 80mm; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 2px 0; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .border-t { border-top: 1px dashed #000; }
          .text-center { text-align: center; }
          .mt-2 { margin-top: 8px; }
          .mb-2 { margin-bottom: 8px; }
          .pt-2 { padding-top: 8px; }
        </style>
      </head><body>
        ${receiptHtml}
        <script>window.print(); window.close();<\/script>
      </body></html>
    `)
    printWindow.document.close()
  }

  if (!sale) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 min-w-0">
            <span className="truncate">
              {sale.isReturn ? "Devolución" : "Venta"} #{sale.localId ?? sale.id.slice(0, 8)}
            </span>
            <button
              type="button"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              title="Copiar ID completo"
              onClick={() => navigator.clipboard.writeText(sale.localId ?? sale.id)}
            >
              <Copy className="size-3.5" />
            </button>
          </DialogTitle>
          <DialogDescription>
            {new Date(sale.createdAt).toLocaleDateString("es", {
              dateStyle: "long",
            })}{" "}
            -{" "}
            {new Date(sale.createdAt).toLocaleTimeString("es", {
              timeStyle: "short",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Método de pago</span>
              <p className="font-medium">
                {
                  {
                    CASH: "Efectivo",
                    CARD: "Tarjeta",
                    TRANSFER: "Transferencia",
                    CREDIT: "Crédito",
                  }[sale.paymentMethod as string] ?? sale.paymentMethod
                }
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Cajero</span>
              <p className="font-medium">{sale.user?.name ?? "—"}</p>
            </div>
              {sale.isReturn && sale.parentSaleId && (
                <div>
                  <span className="text-muted-foreground">Venta original</span>
                  <p className="font-medium font-mono text-xs">{sale.parentSaleId}</p>
                </div>
              )}
              {sale.customer && (
                <>
                  <div>
                    <span className="text-muted-foreground">Cliente</span>
                    <p className="font-medium">{sale.customer.name}</p>
                  </div>
                  {sale.customer.phone && (
                    <div>
                      <span className="text-muted-foreground">Teléfono</span>
                      <p className="font-medium">{sale.customer.phone}</p>
                    </div>
                  )}
                </>
              )}
          </div>

          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Producto</th>
                  <th className="px-3 py-2 text-right font-medium">Cant.</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {(sale.items ?? []).map((item: any) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{item.product.name}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {item.weightInGrams
                        ? item.weightInGrams >= 1000
                          ? (item.weightInGrams / 1000).toFixed(3).replace(/\.?0+$/, "") + " kg"
                          : item.weightInGrams + " g"
                        : item.quantity
                      }
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums font-medium">
                      {new Intl.NumberFormat("es-CO", {
                        style: "currency",
                        currency: "COP",
                        maximumFractionDigits: 0,
                      }).format(Number(item.subtotal))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono tabular-nums">
                {new Intl.NumberFormat("es-CO", {
                  style: "currency",
                  currency: "COP",
                  maximumFractionDigits: 0,
                }).format(Number(sale.subtotal))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA</span>
              <span className="font-mono tabular-nums">
                {new Intl.NumberFormat("es-CO", {
                  style: "currency",
                  currency: "COP",
                  maximumFractionDigits: 0,
                }).format(Number(sale.tax))}
              </span>
            </div>
            {Number(sale.discount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Descuento</span>
                <span className="font-mono tabular-nums text-destructive">
                  -
                  {new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                    maximumFractionDigits: 0,
                  }).format(Number(sale.discount))}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 text-base font-bold">
              <span>{sale.isReturn ? "Total devuelto" : "Total"}</span>
              <span className={`font-mono tabular-nums ${sale.isReturn ? "text-destructive" : ""}`}>
                {new Intl.NumberFormat("es-CO", {
                  style: "currency",
                  currency: "COP",
                  maximumFractionDigits: 0,
                }).format(Number(sale.total))}
              </span>
            </div>
          </div>

          {sale.notes && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Notas:</span> {sale.notes}
            </p>
          )}
          {sale.returnReason && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Motivo de devolución:</span> {sale.returnReason}
            </p>
          )}
        </div>

        <div className="hidden">
          <div ref={printRef}>
            <Receipt sale={sale} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 size-4" />
            Reimprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
