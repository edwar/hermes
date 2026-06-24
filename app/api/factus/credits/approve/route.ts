import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { FACTUS_TRANSACTION_TYPE, USER_ROLE, AUDIT_ACTION } from "@/lib/constants"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== USER_ROLE.GOD) return NextResponse.json({ error: "Solo GOD" }, { status: 403 })

  const body = await req.json()
  const { companyId, amount } = body as { companyId?: string; amount?: number }

  if (!companyId || !amount || amount <= 0) {
    return NextResponse.json({ error: "companyId y amount requeridos" }, { status: 400 })
  }

  const result = await withPrismaRetry(
    () =>
      prisma.$transaction(async (tx) => {
        const company = await tx.company.findUnique({
          where: { id: companyId },
          select: { factusCreditPending: true, factusCreditBalance: true },
        })
        if (!company) throw new Error("Empresa no encontrada")
        if (company.factusCreditPending < amount) {
          throw new Error(`Solo hay ${company.factusCreditPending} créditos pendientes`)
        }

        await tx.company.update({
          where: { id: companyId },
          data: {
            factusCreditPending: { decrement: amount },
            factusCreditBalance: { increment: amount },
          },
        })

        const newBalance = company.factusCreditBalance + amount

        await tx.factusCreditTransaction.create({
          data: {
            companyId,
            type: FACTUS_TRANSACTION_TYPE.PURCHASE,
            amount,
            balanceAfter: newBalance,
            notes: `${amount} créditos activados por ${session.user.name}`,
          },
        })

        return { newBalance, remainingPending: company.factusCreditPending - amount }
      }),
    "factus-credits:approve"
  )

  await logAudit({
    userId: session.user.id,
    companyId,
    action: AUDIT_ACTION.FACTUS_CREDITS_PURCHASED,
    entity: "Company",
    entityId: companyId,
    metadata: { activated: amount, remainingPending: result.remainingPending },
    req,
  })

  return NextResponse.json(result)
}
