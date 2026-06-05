"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Pagination } from "@/components/ui/pagination"
import { PurchaseOrderForm } from "@/components/purchase-orders/purchase-order-form"
import { usePurchaseOrders, useReceivePurchaseOrder } from "@/features/purchase-orders/hooks/use-purchase-orders"
import { useProducts } from "@/features/inventory/hooks/use-products"
import { formatCOP } from "@/lib/utils"
import { Plus, PackageSearch, Check, X, Eye, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING: { label: "Pendiente", variant: "outline" },
  RECEIVED: { label: "Recibido", variant: "default" },
  CANCELLED: { label: "Cancelado", variant: "destructive" },
}

export function PurchaseOrdersTable() {
  const [formOpen, setFormOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [detailOrder, setDetailOrder] = useState<any>(null)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [receiveItems, setReceiveItems] = useState<any[]>([])
  const [page, setPage] = useState(1)

  const { data, isLoading, refetch } = usePurchaseOrders(statusFilter || undefined, page)
  const receiveOrder = useReceivePurchaseOrder()

  const orders = data?.orders ?? []

  function handleReceive(order: any) {
    setDetailOrder(order)
    setReceiveItems(
      order.items.map((item: any) => ({
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        purchasePrice: Number(item.purchasePrice),
        receivedQty: 0,
      }))
    )
    setReceiveOpen(true)
  }

  async function confirmReceive() {
    const itemsToReceive = receiveItems
      .filter((i) => i.receivedQty > 0)
      .map((i) => ({
        productId: i.productId,
        quantity: i.receivedQty,
        purchasePrice: i.purchasePrice,
      }))

    if (itemsToReceive.length === 0) return

    await receiveOrder.mutateAsync({ id: detailOrder.id, items: itemsToReceive })
    setReceiveOpen(false)
    setDetailOrder(null)
    setReceiveItems([])
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setPage(1); setStatusFilter(v === "all" ? "" : (v || "")) }}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="PENDING">Pendientes</SelectItem>
              <SelectItem value="RECEIVED">Recibidos</SelectItem>
              <SelectItem value="CANCELLED">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setFormOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 size-4" />
          Nuevo Pedido
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <PackageSearch className="size-12 text-muted-foreground/40" />
          <p className="mt-4 text-sm font-medium text-muted-foreground">Sin pedidos</p>
          <p className="text-xs text-muted-foreground/60">Crea tu primer pedido de compra</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden md:table-cell">Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="hidden sm:table-cell">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order: any) => {
                const status = STATUS_LABELS[order.status] ?? { label: order.status, variant: "outline" as const }
                return (
                  <TableRow key={order.id}>
                    <TableCell className="hidden md:table-cell text-sm">
                      {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">{order.supplier.name}</TableCell>
                    <TableCell className="text-right font-mono">{formatCOP(Number(order.total))}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 md:size-8 touch-target"
                          onClick={() => setDetailOrder(order)}
                          aria-label="Ver detalle"
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        {order.status === "PENDING" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 md:size-8 text-green-600 touch-target"
                            onClick={() => handleReceive(order)}
                            aria-label="Recibir pedido"
                          >
                            <Check className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination
        page={data?.page ?? 1}
        pages={data?.pages ?? 1}
        total={data?.total}
        onPageChange={setPage}
      />

      <PurchaseOrderForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => refetch()}
      />

      <Dialog open={!!detailOrder} onOpenChange={(v) => { if (!v) setDetailOrder(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del Pedido</DialogTitle>
            <DialogDescription>
              {detailOrder && `Pedido #${detailOrder.id.slice(0, 8)} - ${detailOrder.supplier.name}`}
            </DialogDescription>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">P. Compra</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailOrder.items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.product.name}</TableCell>
                        <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                        <TableCell className="text-right font-mono">{formatCOP(Number(item.purchasePrice))}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCOP(Number(item.purchasePrice) * item.quantity)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="font-mono">{formatCOP(Number(detailOrder.total))}</span>
              </div>
              {detailOrder.notes && (
                <p className="text-sm text-muted-foreground">Notas: {detailOrder.notes}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDetailOrder(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={receiveOpen} onOpenChange={(v) => { if (!v) setReceiveOpen(false) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Recibir Pedido</DialogTitle>
            <DialogDescription>
              Ingresa la cantidad recibida para cada producto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {receiveItems.map((item) => (
              <div key={item.productId} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    Cantidad pedida: {item.quantity} - P. Compra: {formatCOP(item.purchasePrice)}
                  </p>
                </div>
                <Input
                  type="number"
                  min="0"
                  max={item.quantity}
                  value={item.receivedQty}
                  onChange={(e) =>
                    setReceiveItems(
                      receiveItems.map((i) =>
                        i.productId === item.productId
                          ? { ...i, receivedQty: parseInt(e.target.value) || 0 }
                          : i
                      )
                    )
                  }
                  className="w-24"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReceiveOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmReceive} disabled={receiveOrder.isPending}>
              {receiveOrder.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirmar Recepción
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full text-sm">{children}</table>
}

function TableHeader({ children }: { children: React.ReactNode }) {
  return <thead className="bg-muted/50">{children}</thead>
}

function TableRow({ children }: { children: React.ReactNode }) {
  return <tr className="border-b">{children}</tr>
}

function TableHead({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-left font-medium ${className}`}>{children}</th>
}

function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>
}

function TableCell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>
}
