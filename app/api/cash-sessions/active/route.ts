import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { CASH_SESSION_STATUS, SORT_DIRECTION } from "@/lib/constants"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const active = await withPrismaRetry(
    () =>
      prisma.cashSession.findFirst({
        where: { userId: session.user.id, status: CASH_SESSION_STATUS.OPEN },
        include: {
          cashRegister: true,
          user: { select: { id: true, name: true } },
          _count: { select: { sales: true } },
        },
        orderBy: { openedAt: SORT_DIRECTION.DESC },
      }),
    "cash-session:active"
  )

  return NextResponse.json(active)
}
