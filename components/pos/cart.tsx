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
  variant?: "panel" | "sheet"
  onClose?: () => void
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
  variant = "panel",
  onClose,
}: CartProps) {
  const isSheet = variant === "sheet"

  return (
    <div
      className={
        isSheet
          ? "flex w-full flex-col bg-background rounded-t-lg"
          : "hidden md:flex w-full md:w-96 flex-col border-l bg-background"
      }
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Carrito</h2>
          <span className="text-sm text-muted-foreground">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>
        {isSheet && onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="touch-target" aria-label="Cerrar carrito">
            <span className="text-xl leading-none">×</span>
          </Button>
        )}
      </div>

      {isSheet ? (
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {isEmpty ? (
            <EmptyCart />
          ) : (
            <div className="space-y-2 pb-2">{items.map((item) => (
              <CartItemRow
                key={item.productId}
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onRemove={onRemoveItem}
                compact
              />
            ))}</div>
          )}
        </div>
      ) : (
        <ScrollArea className="flex-1 max-h-[65vh] px-4 py-2">
          {isEmpty ? (
            <EmptyCart />
          ) : (
            <div className="space-y-2">{items.map((item) => (
              <CartItemRow
                key={item.productId}
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onRemove={onRemoveItem}
              />
            ))}</div>
          )}
        </ScrollArea>
      )}

      <div className="border-t px-4 py-3 safe-bottom">
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
          className="mt-4 h-12 w-full text-base touch-target"
          disabled={isEmpty}
          onClick={onCheckout}
        >
          Cobrar <span className="font-mono ml-1">{formatCOP(total)}</span>
        </Button>
      </div>
    </div>
  )
}

function EmptyCart() {
  return (
    <div className="flex h-full items-center justify-center py-12">
      <div className="text-center">
        <ShoppingCart className="mx-auto size-12 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Carrito vacío</p>
        <p className="text-xs text-muted-foreground">Selecciona productos para empezar</p>
      </div>
    </div>
  )
}

function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
  compact = false,
}: {
  item: CartItem
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemove: (productId: string) => void
  compact?: boolean
}) {
  return (
    <div
      className={
        compact
          ? "rounded-lg border p-2.5 space-y-2"
          : "flex items-center gap-3 rounded-lg border p-3"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono">{formatCOP(item.price)}</span> c/u
          </p>
        </div>
        {!compact && (
          <p className="text-sm font-medium font-mono tabular-nums whitespace-nowrap">
            {formatCOP(item.subtotal)}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 touch-target"
            onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
            aria-label="Disminuir cantidad"
          >
            <Minus className="size-3" />
          </Button>
          <span className="flex h-8 w-9 items-center justify-center text-sm font-medium font-mono tabular-nums">
            {item.quantity}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 touch-target"
            onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
            aria-label="Aumentar cantidad"
          >
            <Plus className="size-3" />
          </Button>
        </div>
        {compact && (
          <p className="text-sm font-medium font-mono tabular-nums whitespace-nowrap">
            {formatCOP(item.subtotal)}
          </p>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive touch-target"
          onClick={() => onRemove(item.productId)}
          aria-label="Eliminar producto"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
