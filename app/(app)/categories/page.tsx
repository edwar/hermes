import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { CategoryManager } from "@/components/inventory/category-manager"

export default async function CategoriesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role === "GOD") redirect("/god-dashboard")
  return <CategoryManager />
}
