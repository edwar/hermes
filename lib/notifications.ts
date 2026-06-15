import { prisma } from "@/lib/prisma"

export async function sendNotification(params: {
  userId: string
  type: string
  title: string
  message?: string
  metadata?: Record<string, unknown>
}) {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message ?? null,
        metadata: params.metadata as any,
      },
    })
  } catch (err) {
    console.error("[notifications] Error sending notification:", err)
  }
}

export async function notifyLowCredit(companyId: string, balanceAfter: number) {
  if (balanceAfter > 10) return

  const users = await prisma.user.findMany({
    where: {
      companyId,
      role: { in: ["GOD", "OWNER", "ADMIN"] },
      isActive: true,
    },
    select: { id: true },
  })

  // Also notify all GOD users (cross-company)
  const gods = await prisma.user.findMany({
    where: { role: "GOD", isActive: true },
    select: { id: true },
  })

  const allUsers = [...new Set([...users, ...gods].map((u) => u.id))]

  for (const userId of allUsers) {
    await sendNotification({
      userId,
      type: "FACTUS_LOW_CREDIT",
      title: "Saldo bajo de créditos Factus",
      message: balanceAfter <= 0
        ? `La empresa ha agotado sus créditos de facturación electrónica. No se emitirán FE hasta que se recarguen.`
        : `A la empresa le quedan ${balanceAfter} créditos de facturación electrónica.`,
      metadata: { companyId, balanceAfter },
    })
  }
}
