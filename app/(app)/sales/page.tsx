import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SalesTable } from "@/components/sales/sales-table"

export default async function SalesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role === "GOD") redirect("/system-settings")
  return <SalesTable />
}
