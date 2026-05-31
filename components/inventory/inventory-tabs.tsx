"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProductTable } from "@/components/inventory/product-table"
import { StockMovementsTable } from "@/components/inventory/stock-movements-table"
import { Package, ArrowLeftRight } from "lucide-react"

interface InventoryTabsProps {
  role: string
}

export function InventoryTabs({ role }: InventoryTabsProps) {
  const isCashier = role === "CASHIER"

  if (isCashier) {
    return <StockMovementsTable />
  }

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
