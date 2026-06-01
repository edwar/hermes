import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ElectronicInvoicesTable } from "@/components/electronic-invoices/electronic-invoices-table"

export default async function ElectronicInvoicesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  return <ElectronicInvoicesTable />
}
