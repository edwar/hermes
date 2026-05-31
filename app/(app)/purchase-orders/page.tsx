import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PurchaseOrdersTable } from "@/components/purchase-orders/purchase-orders-table"

export default async function PurchaseOrdersPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "ADMIN" && session.user.role !== "GOD" && session.user.role !== "MANAGER") {
    redirect("/")
  }
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
