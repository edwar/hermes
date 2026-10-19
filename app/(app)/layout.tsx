import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/shared/dashboard-shell"
import { modulesFor } from "@/lib/permissions"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/")

  // El menú muestra solo lo que esta persona puede usar, con las reglas guardadas aplicadas.
  const modules = await modulesFor({
    userId: session.user.id,
    role: session.user.role,
    companyId: session.user.companyId,
  })

  return <DashboardShell modules={modules}>{children}</DashboardShell>
}
