import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { InvitesClient } from "./invites-client"

export default async function InvitesPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "GOD") {
    redirect("/dashboard")
  }

  return <InvitesClient />
}
