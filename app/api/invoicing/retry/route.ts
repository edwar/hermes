import { NextRequest, NextResponse } from "next/server"
import { guardModule } from "@/lib/permissions/guard"
import { forceRetryCompany, retryPendingInvoices } from "@/lib/invoicing/retry"

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

  const guard = await guardModule("/electronic-invoices/manage")
  if ("error" in guard) return guard.error
  const { session } = guard
  if (!session.user.companyId) return NextResponse.json({ error: "Usuario sin empresa" }, { status: 400 })

  return NextResponse.json(await forceRetryCompany(session.user.companyId))
}

export const GET = handle
export const POST = handle
