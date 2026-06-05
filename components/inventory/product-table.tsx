"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StockBadge } from "@/components/inventory/stock-badge"
import { ProductForm } from "@/components/inventory/product-form"
import {
  useProducts,
  useDeleteProduct,
  type ProductFilters,
} from "@/features/inventory/hooks/use-products"
import { useCategories } from "@/features/inventory/hooks/use-categories"
import { formatCOP } from "@/lib/utils"
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Package,
} from "lucide-react"

export function ProductTable() {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [onlyLowStock, setOnlyLowStock] = useState(false)
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null)

  const filters: ProductFilters = {
    search,
    categoryId: categoryFilter,
    page,
    pageSize: 10,
    onlyLowStock,
  }

  const { data, isLoading } = useProducts(filters)
  const { data: categories } = useCategories()
  const deleteProduct = useDeleteProduct()

  function handleEdit(product: any) {
    setEditingProduct(product)
    setFormOpen(true)
  }

  function handleAdd() {
    setEditingProduct(null)
    setFormOpen(true)
  }

  async function handleDelete(id: string) {
    await deleteProduct.mutateAsync(id)
    setDeleteDialog(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Inventario</h2>
        <Button onClick={handleAdd} className="w-full sm:w-auto">
          <Plus className="mr-2 size-4" />
          Agregar Producto
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o código de barras..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={categoryFilter}
          onValueChange={(v) => {
            setCategoryFilter(v ?? "")
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas las categorías</SelectItem>
            {categories?.map((cat: { id: string; name: string }) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={onlyLowStock ? "default" : "outline"}
          onClick={() => {
            setOnlyLowStock(!onlyLowStock)
            setPage(1)
          }}
          className="w-full sm:w-auto"
        >
          <AlertTriangle className="mr-2 size-4" />
          Stock bajo
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="hidden md:table-cell">Código</TableHead>
              <TableHead className="hidden md:table-cell">Categoría</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Ref. Compra</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Ganancia %</TableHead>
              <TableHead className="text-right">P. Venta</TableHead>
              <TableHead className="text-center">Stock</TableHead>
              <TableHead className="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.products?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <Package className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No se encontraron productos
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              data?.products?.map((product: any) => {
                const salePrice = Math.round(product.purchasePrice * (1 + product.profitMargin))
                return (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                    {product.barcode ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{product.category?.name}</TableCell>
                  <TableCell className="hidden lg:table-cell text-right font-mono text-muted-foreground">
                    {product.purchasePrice > 0 ? formatCOP(product.purchasePrice) : "--"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right font-mono text-muted-foreground">
                    {(product.profitMargin * 100).toFixed(0)}%
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCOP(salePrice)}
                  </TableCell>
                  <TableCell className="text-center">
                    <StockBadge
                      stock={product.stock}
                      minStock={product.minStock}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 md:size-8 touch-target"
                        onClick={() => handleEdit(product)}
                        aria-label="Editar"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 md:size-8 touch-target"
                        onClick={() => setDeleteDialog(product.id)}
                        aria-label="Eliminar"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            )
            )}
          </TableBody>
        </Table>
      </div>

      {data?.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page} de {data.pages} ({data.total} productos)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pages}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <ProductForm
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
      />

      <Dialog
        open={!!deleteDialog}
        onOpenChange={() => setDeleteDialog(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este producto? Esta acción
              desactivará el producto pero no eliminará su historial de ventas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialog(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog && handleDelete(deleteDialog)}
              disabled={deleteProduct.isPending}
            >
              {deleteProduct.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
