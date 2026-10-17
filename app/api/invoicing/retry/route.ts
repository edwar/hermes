import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { forceRetryCompany, retryPendingInvoices } from "@/lib/invoicing/retry"
import { USER_ROLE } from "@/lib/constants"

// Reintenta las facturas electrónicas pendientes.
//   - Cron (todas las empresas): GET/POST con `Authorization: Bearer <CRON_SECRET>`.
//   - Usuario (solo su empresa):  POST con sesión; reinicia el contador de intentos.
async function handle(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authorization = req.headers.get("authorization")

  if (cronSecret && authorization === `Bearer ${cronSecret}`) {
    return NextResponse.json(await retryPendingInvoices())
  }

  if (req.method !== "POST") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!session.user.companyId) return NextResponse.json({ error: "Usuario sin empresa" }, { status: 400 })
  if (session.user.role === USER_ROLE.CASHIER) {
    return NextResponse.json({ error: "No tiene permisos" }, { status: 403 })
  }

  return NextResponse.json(await forceRetryCompany(session.user.companyId))
}

export const GET = handle
export const POST = handle
