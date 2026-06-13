import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const active = await withPrismaRetry(
    () =>
      prisma.cashSession.findFirst({
        where: { userId: session.user.id, status: "OPEN" },
        include: {
          cashRegister: true,
          user: { select: { id: true, name: true } },
          _count: { select: { sales: true } },
        },
        orderBy: { openedAt: "desc" },
      }),
    "cash-session:active"
  )

  return NextResponse.json(active)
}
