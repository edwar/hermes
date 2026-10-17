"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { usePosProducts } from "@/features/pos/hooks/use-pos-products"
import { formatCOP } from "@/lib/utils"
import { Search, Package, Scale } from "lucide-react"

interface ProductGridProps {
  /** Cantidad de cada producto que ya está en el ticket, por id. */
  cartQuantities?: Record<string, number>
  onAddProduct: (product: {
    id: string
    name: string
    barcode?: string | null
    price: number
    stock: number
    sellByWeight?: boolean
    weightUnit?: string
  }) => void
}

function getSalePrice(product: { purchasePrice: number; profitMargin: number }): number {
  return Math.round(product.purchasePrice * (1 + product.profitMargin))
}

export function ProductGrid({ onAddProduct, cartQuantities = {} }: ProductGridProps) {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = usePosProducts(debouncedSearch)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 pb-24 md:pb-6 min-h-0">
      <div className="pb-3 md:pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Buscar producto por nombre o código de barras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pl-9 text-base md:h-12"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 md:pb-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-[108px] animate-pulse rounded-lg border border-border bg-card" />
            ))}
          </div>
        ) : data?.products?.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Package className="mx-auto size-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No se encontraron productos
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
            {data?.products?.map((product: any) => {
              const inCart = cartQuantities[product.id] ?? 0
              const lowStock = !product.sellByWeight && product.stock <= product.minStock
              return (
                <button
                  key={product.id}
                  onClick={() => onAddProduct({
                    ...product,
                    price: getSalePrice(product),
                  })}
                  disabled={!product.sellByWeight && product.stock === 0}
                  className={`flex min-h-[108px] flex-col justify-between gap-2 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-elevated active:bg-elevated disabled:cursor-not-allowed disabled:opacity-40 touch-target ${inCart > 0 ? "border-info" : "border-border hover:border-seam-strong"}`}
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      {product.sellByWeight && <Scale className="size-3.5 shrink-0 text-muted-foreground" />}
                      <span className="line-clamp-2 text-[13px] leading-tight font-medium md:text-sm">{product.name}</span>
                    </span>
                    {inCart > 0 && (
                      <span className="shrink-0 rounded-sm bg-info/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-info" aria-label={`${inCart} en el ticket`}>
                        ×{inCart}
                      </span>
                    )}
                  </div>
                  <div className="flex w-full flex-col gap-1">
                    <span className="font-mono text-lg leading-none font-semibold tabular-nums whitespace-nowrap md:text-xl">
                      {formatCOP(getSalePrice(product))}
                    </span>
                    <span className={`flex items-center gap-1 font-mono text-[11px] whitespace-nowrap ${lowStock ? "text-warning" : "text-muted-foreground"}`}>
                      {lowStock && <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />}
                      {product.sellByWeight
                        ? `${(product.stock / 1000).toFixed(2)} kg`
                        : lowStock
                          ? `${product.stock} BAJO`
                          : `${product.stock} u`}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
