import { requireModule } from "@/lib/permissions/page-guard"

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireModule("/system-settings")
  return children
}
