"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Pagination } from "@/components/ui/pagination"
import { useStockMovements, type StockMovementFilters } from "@/features/inventory/hooks/use-stock-movements"
import { StockMovementForm } from "@/components/inventory/stock-movement-form"
import { Plus, ArrowDownToLine, ArrowUpFromLine, Search } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { STOCK_MOVEMENT_TYPE } from "@/lib/constants"

export function StockMovementsTable() {
  const [formOpen, setFormOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<StockMovementFilters>({ pageSize: 20 })

  const { data, isLoading } = useStockMovements(filters)

  function handleSearch() {
    setPage(1)
    setFilters((prev) => ({ ...prev, productId: search || undefined, page: 1 }))
  }

  function handleTypeFilter(v: string) {
    setPage(1)
    setTypeFilter(v)
    setFilters((p) => ({ ...p, type: v === " " ? undefined : v, page: 1 }))
  }

  const movements = data?.movements ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID de producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-10 pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => handleTypeFilter(v ?? " ")}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">Todos</SelectItem>
              <SelectItem value={STOCK_MOVEMENT_TYPE.IN}>Entradas</SelectItem>
              <SelectItem value={STOCK_MOVEMENT_TYPE.OUT}>Salidas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setFormOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 size-4" />
          Registrar Movimiento
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : movements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ArrowDownToLine className="size-12 text-muted-foreground/40" />
          <p className="mt-4 text-sm font-medium text-muted-foreground">Sin movimientos</p>
          <p className="text-xs text-muted-foreground/60">Registra el primer movimiento de stock</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden md:table-cell">Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="hidden md:table-cell">Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {format(new Date(m.createdAt), "dd/MM/yy HH:mm", { locale: es })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        m.type === STOCK_MOVEMENT_TYPE.IN
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-destructive/30 bg-destructive/10 text-destructive"
                      }
                    >
                      {m.type === STOCK_MOVEMENT_TYPE.IN ? (
                        <ArrowDownToLine className="mr-1 size-3" />
                      ) : (
                        <ArrowUpFromLine className="mr-1 size-3" />
                      )}
                      {m.type === STOCK_MOVEMENT_TYPE.IN ? "Entrada" : "Salida"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{m.product.name}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {m.type === STOCK_MOVEMENT_TYPE.IN ? "+" : "-"}
                    {m.quantity}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {m.reason ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination
        page={data?.page ?? 1}
        pages={data?.pages ?? 1}
        total={data?.total}
        onPageChange={(p) => {
          setPage(p)
          setFilters((prev) => ({ ...prev, page: p }))
        }}
      />

      <StockMovementForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
