"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useCategories } from "@/features/inventory/hooks/use-categories"
import { useCreateProduct, useUpdateProduct } from "@/features/inventory/hooks/use-products"
import { formatCOP } from "@/lib/utils"

interface Product {
  id: string
  name: string
  barcode?: string | null
  description?: string | null
  purchasePrice: number
  profitMargin: number
  stock: number
  minStock: number
  categoryId: string
  imageUrl?: string | null
}

interface ProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
}

export function ProductForm({
  open,
  onOpenChange,
  product,
}: ProductFormProps) {
  const { data: categories } = useCategories()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct(product?.id ?? "")

  const [name, setName] = useState("")
  const [barcode, setBarcode] = useState("")
  const [description, setDescription] = useState("")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [profitMargin, setProfitMargin] = useState("30")
  const [stock, setStock] = useState("")
  const [minStock, setMinStock] = useState("5")
  const [categoryId, setCategoryId] = useState("")
  const [loading, setLoading] = useState(false)

  const calculatedSalePrice = (() => {
    const pp = parseFloat(purchasePrice) || 0
    const margin = parseFloat(profitMargin) || 0
    if (!pp) return null
    return Math.round(pp * (1 + margin / 100))
  })()

  useEffect(() => {
    if (open) {
      if (product) {
        setName(product.name)
        setBarcode(product.barcode ?? "")
        setDescription(product.description ?? "")
        setPurchasePrice(String(product.purchasePrice))
        setProfitMargin(String((product.profitMargin * 100).toFixed(0)))
        setStock(String(product.stock))
        setMinStock(String(product.minStock))
        setCategoryId(product.categoryId)
      } else {
        setName("")
        setBarcode("")
        setDescription("")
        setPurchasePrice("")
        setProfitMargin("30")
        setStock("")
        setMinStock("5")
        setCategoryId("")
      }
    }
  }, [open, product])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const data = {
      name,
      barcode: barcode || undefined,
      description: description || undefined,
      purchasePrice: parseFloat(purchasePrice) || 0,
      profitMargin: (parseFloat(profitMargin) || 30) / 100,
      stock: parseInt(stock) || 0,
      minStock: parseInt(minStock) || 5,
      categoryId,
    }

    try {
      if (product) {
        await updateProduct.mutateAsync(data)
      } else {
        await createProduct.mutateAsync(data)
      }
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {product ? "Editar Producto" : "Agregar Producto"}
          </DialogTitle>
          <DialogDescription>
            {product
              ? "Modifica los datos del producto"
              : "Registra un nuevo producto en el inventario"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre del producto"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Código de barras</Label>
                <Input
                  id="barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="7701011001001"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción del producto"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">Precio de compra (referencia)</Label>
                <CurrencyInput
                  id="purchasePrice"
                  value={purchasePrice}
                  onChange={setPurchasePrice}
                  placeholder="Último precio de compra (opcional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profitMargin">Ganancia (%)</Label>
                <Input
                  id="profitMargin"
                  type="number"
                  min="0"
                  step="1"
                  value={profitMargin}
                  onChange={(e) => setProfitMargin(e.target.value)}
                  placeholder="30"
                />
              </div>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Precio de venta calculado:</span>
                <span className="font-mono tabular-nums font-semibold">
                  {calculatedSalePrice !== null ? formatCOP(calculatedSalePrice) : "--"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Basado en precio de compra + % ganancia. Se actualiza con cada compra.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Stock actual</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStock">Stock mínimo</Label>
                <Input
                  id="minStock"
                  type="number"
                  min="0"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  placeholder="5"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoría *</Label>
              <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat: { id: string; name: string }) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : product ? "Guardar cambios" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
