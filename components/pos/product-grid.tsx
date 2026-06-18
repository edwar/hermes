"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { usePosProducts } from "@/features/pos/hooks/use-pos-products"
import { formatCOP } from "@/lib/utils"
import { Search, Package, Scale } from "lucide-react"

interface ProductGridProps {
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

export function ProductGrid({ onAddProduct }: ProductGridProps) {
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
            className="h-10 pl-8 text-base md:h-12 md:text-lg"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 md:pb-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-24 md:h-28 animate-pulse rounded-lg bg-muted" />
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
            {data?.products?.map((product: any) => (
              <button
                key={product.id}
                onClick={() => onAddProduct({
                  ...product,
                  price: getSalePrice(product),
                })}
                disabled={!product.sellByWeight && product.stock === 0}
                className="flex flex-col items-start gap-1 rounded-lg border p-2.5 md:p-3 text-left transition-colors hover:border-primary hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-40 touch-target"
              >
                <div className="flex items-center gap-1.5 w-full">
                  {product.sellByWeight && <Scale className="size-3.5 text-muted-foreground shrink-0" />}
                  <span className="line-clamp-2 text-xs md:text-sm font-medium leading-tight">
                    {product.name}
                  </span>
                </div>
                <span className="text-base md:text-lg font-bold text-primary font-mono tabular-nums">
                  {formatCOP(getSalePrice(product))}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] md:text-xs ${!product.sellByWeight && product.stock <= product.minStock
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : ""
                    }`}
                >
                  {product.sellByWeight
                    ? `${(product.stock / 1000).toFixed(2)} kg`
                    : `Stock: ${product.stock}`
                  }
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
