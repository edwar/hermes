"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProductTable } from "@/components/inventory/product-table"
import { StockMovementsTable } from "@/components/inventory/stock-movements-table"
import { Package, ArrowLeftRight } from "lucide-react"
import { useCanSee } from "@/components/shared/allowed-modules"

export function InventoryTabs() {
  // Cada pestaña exige el módulo de su API: Inventario para los productos y Movimientos de stock para el historial.
  const canSee = useCanSee()
  const showProducts = canSee("/inventory")
  const showMovements = canSee("/stock-movements")

  if (!showProducts) return showMovements ? <StockMovementsTable /> : null
  if (!showMovements) return <ProductTable />

  return (
    <Tabs defaultValue="products" className="space-y-4">
      <TabsList>
        <TabsTrigger value="products" className="gap-2">
          <Package className="size-4" />
          Productos
        </TabsTrigger>
        <TabsTrigger value="movements" className="gap-2">
          <ArrowLeftRight className="size-4" />
          Movimientos
        </TabsTrigger>
      </TabsList>
      <TabsContent value="products">
        <ProductTable />
      </TabsContent>
      <TabsContent value="movements">
        <StockMovementsTable />
      </TabsContent>
    </Tabs>
  )
}
