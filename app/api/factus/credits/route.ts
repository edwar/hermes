import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

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
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const role = session.user.role
  if (role !== "GOD" && role !== "OWNER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Solo ADMIN/OWNER/GOD pueden comprar créditos" }, { status: 403 })
  }

  const body = await req.json()
  const quantity = parseInt(body.quantity)
  if (isNaN(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 })
  }

  const companyId = body.companyId || session.user.companyId
  if (!companyId) return NextResponse.json({ error: "Usuario sin empresa" }, { status: 400 })
  if (role !== "GOD" && companyId !== session.user.companyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const result = await withPrismaRetry(
    () =>
      prisma.$transaction(async (tx) => {
        const company = await tx.company.update({
          where: { id: companyId },
          data: {
            factusCreditBalance: { increment: quantity },
            factusCreditTotal: { increment: quantity },
          },
          select: { factusCreditBalance: true, factusCreditTotal: true },
        })

        await tx.factusCreditTransaction.create({
          data: {
            companyId,
            type: "PURCHASE",
            amount: quantity,
            balanceAfter: company.factusCreditBalance,
            notes: `Compra de ${quantity} créditos`,
          },
        })

        return company
      }),
    "factus-credits:purchase"
  )

  await logAudit({
    userId: session.user.id,
    companyId,
    action: "FACTUS_CREDITS_PURCHASED",
    entity: "Company",
    entityId: companyId,
    metadata: { amount: quantity, balanceAfter: result.factusCreditBalance },
    req,
  })

  return NextResponse.json({
    message: `${quantity} crédito(s) agregado(s)`,
    balance: result.factusCreditBalance,
    total: result.factusCreditTotal,
  })
}
