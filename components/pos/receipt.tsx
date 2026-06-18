"use client"

import { useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { formatCOP, formatDateTime } from "@/lib/utils"
import { useSettings } from "@/hooks/use-settings"
import { Loader2 } from "lucide-react"

interface ReceiptProps {
  sale: {
    id: string
    total: number
    subtotal: number
    tax: number
    discount: number
    paymentMethod: string
    createdAt: string
    items: Array<{
      quantity: number
      unitPrice: number
      subtotal: number
      product: { name: string; barcode?: string | null }
      weightInGrams?: number | null
    }>
  }
  customerName?: string
}

export function Receipt({ sale, customerName }: ReceiptProps) {
  const { settings, isLoading } = useSettings()
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const methodLabels: Record<string, string> = {
    CASH: "Efectivo",
    CARD: "Tarjeta",
    TRANSFER: "Transferencia",
    CREDIT: "Crédito",
  }

  const returnUrl = `${origin}/pos?return=${sale.id}`

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const storeName = settings?.storeName ?? "Mi Tienda"
  const storeNit = settings?.nit ?? ""
  const storeAddress = settings?.address ?? ""
  const storePhone = settings?.phone ?? ""
  const storeEmail = settings?.email ?? ""
  const receiptFooter = settings?.receiptFooter ?? "¡Gracias por su compra!"
  const taxPct = settings ? Number(settings.taxRate) * 100 : 19

  return (
    <div className="receipt mx-auto max-w-[80mm] bg-white p-2 text-xs text-black">
      <div className="text-center">
        <p className="text-sm font-bold">{storeName}</p>
        {storeNit && <p>{storeNit}</p>}
        {storeAddress && <p>{storeAddress}</p>}
        {storePhone && <p>{storePhone}</p>}
        {storeEmail && <p>{storeEmail}</p>}
      </div>

      <div className="my-2 border-t border-dashed border-gray-400" />

      <div className="text-center text-xs">
        <p>{storeName}</p>
        <p>{formatDateTime(sale.createdAt)}</p>
        <p className="font-mono">#{sale.id.slice(-8).toUpperCase()}</p>
      </div>

      <div className="my-2 border-t border-dashed border-gray-400" />

      {customerName && (
        <p className="mb-1">Cliente: {customerName}</p>
      )}

      <table className="w-full text-xs">
        <thead>
          <tr className="font-bold">
            <td className="pb-1">Item</td>
            <td className="pb-1 text-right">Cant</td>
            <td className="pb-1 text-right">Precio</td>
            <td className="pb-1 text-right">Total</td>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, i) => (
            <tr key={i}>
              <td className="pr-2">{item.product.name}</td>
              <td className="px-1 text-right font-mono">
                {item.weightInGrams
                  ? item.weightInGrams >= 1000
                    ? (item.weightInGrams / 1000).toFixed(3).replace(/\.?0+$/, "") + " kg"
                    : item.weightInGrams + " g"
                  : item.quantity
                }
              </td>
              <td className="px-1 text-right font-mono">
                {item.weightInGrams ? formatCOP(Number(item.unitPrice)) + "/kg" : formatCOP(Number(item.unitPrice))}
              </td>
              <td className="pl-1 text-right font-mono">{formatCOP(Number(item.subtotal))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="my-2 border-t border-dashed border-gray-400" />

      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-mono">{formatCOP(Number(sale.subtotal))}</span>
        </div>
        <div className="flex justify-between">
          <span>IVA {taxPct.toFixed(0)}%</span>
          <span className="font-mono">{formatCOP(Number(sale.tax))}</span>
        </div>
        {Number(sale.discount) > 0 && (
          <div className="flex justify-between">
            <span>Descuento</span>
            <span className="font-mono">-{formatCOP(Number(sale.discount))}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold">
          <span>TOTAL</span>
          <span className="font-mono">{formatCOP(Number(sale.total))}</span>
        </div>
      </div>

      <div className="my-2 border-t border-dashed border-gray-400" />

      <div className="text-center">
        <p>Método de pago: {methodLabels[sale.paymentMethod] ?? sale.paymentMethod}</p>
      </div>

      {origin && (
        <>
          <div className="my-2 border-t border-dashed border-gray-400" />
          <div className="flex flex-col items-center gap-1">
            <QRCodeSVG value={returnUrl} size={80} level="M" />
            <p className="text-[8px] text-gray-400">Escanea para gestionar devolución</p>
          </div>
        </>
      )}

      <div className="mt-3 text-center text-[10px] text-gray-500">
        <p>{receiptFooter}</p>
      </div>
    </div>
  )
}
