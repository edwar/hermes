"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatCOP } from "@/lib/utils"
import { TAX_RATE } from "@/lib/constants"
import { Trash2, Minus, Plus, ShoppingCart } from "lucide-react"
import type { CartItem } from "@/features/pos/types"

interface CartProps {
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
  isEmpty: boolean
  itemCount: number
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemoveItem: (productId: string) => void
  onCheckout: () => void
}

export function Cart({
  items,
  subtotal,
  tax,
  total,
  isEmpty,
  itemCount,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartProps) {
  return (
    <div className="flex w-96 flex-col border-l bg-background">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Carrito</h2>
          <span className="text-sm text-muted-foreground">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 max-h-[65vh] px-4 py-2">
        {isEmpty ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <ShoppingCart className="mx-auto size-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Carrito vacío
              </p>
              <p className="text-xs text-muted-foreground">
                Selecciona productos para empezar
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{formatCOP(item.price)}</span> c/u
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span className="flex h-7 w-8 items-center justify-center text-sm font-medium font-mono tabular-nums">
                    {item.quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>
                <div className="w-20 text-right">
                  <p className="text-sm font-medium font-mono tabular-nums">
                    {formatCOP(item.subtotal)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-destructive"
                  onClick={() => onRemoveItem(item.productId)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="border-t px-4 py-3">
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-mono tabular-nums">{formatCOP(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">IVA ({(TAX_RATE * 100).toFixed(0)}%)</span>
            <span className="font-mono tabular-nums">{formatCOP(tax)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="font-mono tabular-nums">{formatCOP(total)}</span>
          </div>
        </div>
        <Button
          className="mt-4 h-12 w-full text-base"
          disabled={isEmpty}
          onClick={onCheckout}
        >
          Cobrar <span className="font-mono">{formatCOP(total)}</span>
        </Button>
      </div>
    </div>
  )
}
