"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatCOP } from "@/lib/utils"
import { TAX_RATE } from "@/lib/constants"
import { Trash2, Minus, Plus, ShoppingCart, Scale } from "lucide-react"
import type { CartItem } from "@/features/pos/types"
import { ScaleInput } from "@/components/pos/scale-input"

interface CartProps {
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
  isEmpty: boolean
  itemCount: number
  onUpdateQuantity: (productId: string, quantity: number) => void
  onUpdateWeight?: (productId: string, weightInGrams: number) => void
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
  onUpdateWeight,
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
          ? "flex w-full flex-col rounded-t-lg bg-card"
          : "hidden w-full flex-col border-l border-border bg-card md:flex md:w-[400px]"
      }
    >
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2.5">
          <h2 className="font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">Ticket</h2>
          <span className="rounded-sm bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-foreground">
            {itemCount} {itemCount === 1 ? "ítem" : "ítems"}
          </span>
        </div>
        {isSheet && onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="touch-target" aria-label="Cerrar ticket">
            <span className="text-xl leading-none">×</span>
          </Button>
        )}
      </div>

      {isSheet ? (
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <EmptyCart />
          ) : (
            <ul className="divide-y divide-border">{items.map((item) => (
              <CartItemRow
                key={item.productId}
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onUpdateWeight={onUpdateWeight}
                onRemove={onRemoveItem}
              />
            ))}</ul>
          )}
        </div>
      ) : (
        <ScrollArea className="max-h-[65vh] flex-1">
          {isEmpty ? (
            <EmptyCart />
          ) : (
            <ul className="divide-y divide-border">{items.map((item) => (
              <CartItemRow
                key={item.productId}
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onUpdateWeight={onUpdateWeight}
                onRemove={onRemoveItem}
              />
            ))}</ul>
          )}
        </ScrollArea>
      )}

      <div className="safe-bottom border-t border-border bg-background px-4 py-4">
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-mono tabular-nums">{formatCOP(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">IVA ({(TAX_RATE * 100).toFixed(0)}%)</dt>
            <dd className="font-mono tabular-nums">{formatCOP(tax)}</dd>
          </div>
        </dl>
        <div className="mt-3 flex items-end justify-between border-t border-border pt-3">
          <span className="pb-1.5 font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">Total</span>
          <span className="font-mono text-[40px] leading-none font-semibold tracking-tight tabular-nums" aria-live="polite">
            {formatCOP(total)}
          </span>
        </div>
        <Button
          size="lg"
          className="mt-4 h-14 w-full justify-between px-5 text-base touch-target"
          disabled={isEmpty}
          onClick={onCheckout}
        >
          <span className="font-semibold">Cobrar</span>
          <kbd className="hidden rounded-sm border border-white/30 px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-[0.06em] md:inline">ESPACIO</kbd>
        </Button>
      </div>
    </div>
  )
}

function EmptyCart() {
  return (
    <div className="flex h-full items-center justify-center px-6 py-14">
      <div className="text-center">
        <ShoppingCart className="mx-auto size-8 text-faint" />
        <p className="mt-3 text-sm font-medium">Ticket vacío</p>
        <p className="mt-1 text-xs text-muted-foreground">Toca un producto o escanea un código para empezar</p>
      </div>
    </div>
  )
}

function CartItemRow({
  item,
  onUpdateQuantity,
  onUpdateWeight,
  onRemove,
}: {
  item: CartItem
  onUpdateQuantity: (productId: string, quantity: number) => void
  onUpdateWeight?: (productId: string, weightInGrams: number) => void
  onRemove: (productId: string) => void
}) {
  return (
    <li className="flex items-stretch">
      <div className="min-w-0 flex-1 space-y-2 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {item.sellByWeight && <Scale className="size-3.5 shrink-0 text-muted-foreground" />}
              <p className="truncate text-sm font-medium">{item.name}</p>
            </div>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {formatCOP(item.price)}
              {item.sellByWeight ? "/kg" : " c/u"}
            </p>
          </div>
          <p className="font-mono text-sm font-semibold whitespace-nowrap tabular-nums">
            {formatCOP(item.subtotal)}
          </p>
        </div>
        {item.sellByWeight && onUpdateWeight ? (
          <ScaleInput
            weightUnit={item.weightUnit ?? "g"}
            weightInGrams={item.weightInGrams ?? 0}
            onWeightChange={(grams) => onUpdateWeight(item.productId, grams)}
          />
        ) : (
          <div className="inline-flex items-center rounded-md border border-border">
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-r-none touch-target"
              onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
              aria-label="Disminuir cantidad"
            >
              <Minus className="size-3.5" />
            </Button>
            <span className="flex h-9 w-10 items-center justify-center border-x border-border font-mono text-sm font-semibold tabular-nums">
              {item.quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-l-none touch-target"
              onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
              aria-label="Aumentar cantidad"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
      {/* Acción destructiva aislada en su propia columna, lejos de los controles de cantidad */}
      <div className="flex w-12 shrink-0 items-start justify-center border-l border-border pt-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-9 text-faint hover:bg-destructive/10 hover:text-destructive touch-target"
          onClick={() => onRemove(item.productId)}
          aria-label={`Quitar ${item.name} del ticket`}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  )
}
