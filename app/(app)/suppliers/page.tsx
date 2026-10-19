import { SuppliersTable } from "@/components/suppliers/suppliers-table"

export default async function SuppliersPage() {
  // El acceso lo decide el layout del módulo (requireModule): aquí no se repite la comprobación de rol.
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
        <p className="text-muted-foreground">Gestiona tus proveedores y pedidos</p>
      </div>
      <SuppliersTable />
    </div>
  )
}
