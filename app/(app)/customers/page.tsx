import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { CustomersTable } from "@/components/inventory/customers-table"

export default async function CustomersPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  return <CustomersTable />
}
