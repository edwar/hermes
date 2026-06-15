import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SuppliersTable } from "@/components/suppliers/suppliers-table"

export default async function SuppliersPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    redirect("/")
  }
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
