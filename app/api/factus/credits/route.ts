import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { guardModule } from "@/lib/permissions/guard"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { notifyLowCredit } from "@/lib/notifications"
import { logAudit } from "@/lib/audit"
import { FACTUS_TRANSACTION_TYPE, USER_ROLE, AUDIT_ACTION } from "@/lib/constants"
import { notifyCreditRequested } from "@/lib/notifications"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const companyId = session.user.companyId
  if (!companyId) return NextResponse.json({ error: "Usuario sin empresa" }, { status: 400 })

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { factusCreditBalance: true, factusCreditTotal: true },
  })

  return NextResponse.json({
    balance: company?.factusCreditBalance ?? 0,
    total: company?.factusCreditTotal ?? 0,
  })
}

export async function POST(req: NextRequest) {
  const guard = await guardModule("/settings")
  if ("error" in guard) return guard.error
  const { session } = guard
  const role = session.user.role

  const body = await req.json()
  const quantity = parseInt(body.quantity)
  if (isNaN(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 })
  }

  const companyId = body.companyId || session.user.companyId
  if (!companyId) return NextResponse.json({ error: "Usuario sin empresa" }, { status: 400 })
  if (role !== USER_ROLE.GOD && companyId !== session.user.companyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const result = await withPrismaRetry(
    () =>
      prisma.$transaction(async (tx) => {
        const company = await tx.company.update({
          where: { id: companyId },
          data: {
            factusCreditPending: { increment: quantity },
            factusCreditTotal: { increment: quantity },
          },
          select: { factusCreditPending: true, factusCreditTotal: true, factusCreditBalance: true },
        })

        await tx.factusCreditTransaction.create({
          data: {
            companyId,
            type: FACTUS_TRANSACTION_TYPE.PURCHASE,
            amount: quantity,
            balanceAfter: company.factusCreditBalance,
            notes: `Compra de ${quantity} créditos (pendiente de activación)`,
          },
        })

        return company
      }),
    "factus-credits:purchase"
  )

  await logAudit({
    userId: session.user.id,
    companyId,
    action: AUDIT_ACTION.FACTUS_CREDITS_PURCHASED,
    entity: "Company",
    entityId: companyId,
    metadata: { amount: quantity, pending: result.factusCreditPending },
    req,
  })

  notifyCreditRequested(companyId, quantity)

  return NextResponse.json({
    message: `${quantity} crédito(s) agregado(s) a la cola de activación`,
    pending: result.factusCreditPending,
    total: result.factusCreditTotal,
  })
}
