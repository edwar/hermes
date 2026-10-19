import { PurchaseOrdersTable } from "@/components/purchase-orders/purchase-orders-table"

export default async function PurchaseOrdersPage() {
  // El acceso lo decide el layout del módulo (requireModule): aquí no se repite la comprobación de rol.
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compras</h1>
        <p className="text-muted-foreground">Gestiona pedidos a proveedores y recibe mercancía</p>
      </div>
      <PurchaseOrdersTable />
    </div>
  )
}
