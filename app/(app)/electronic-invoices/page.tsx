import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ElectronicInvoicesTable } from "@/components/electronic-invoices/electronic-invoices-table"
import { FactusPendingCard } from "@/components/electronic-invoices/factus-pending-card"

export default async function ElectronicInvoicesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role === "GOD") redirect("/god-dashboard")
  return (
    <div className="space-y-6">
      <FactusPendingCard />
      <ElectronicInvoicesTable />
    </div>
  )
}
