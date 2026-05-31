import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { InventoryTabs } from "@/components/inventory/inventory-tabs"

export default async function InventoryPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const role = session.user.role

  return <InventoryTabs role={role} />
}
