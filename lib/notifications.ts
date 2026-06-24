import { prisma } from "@/lib/prisma"
import { USER_ROLE } from "@/lib/constants"
import { CONFIG_CATEGORY, CONFIG_KEY } from "@/lib/constants/config"
import { NOTIFICATION_PRIORITY, NOTIFICATION_TYPE } from "@/lib/constants/notification"

export type NotificationPriority = typeof NOTIFICATION_PRIORITY[keyof typeof NOTIFICATION_PRIORITY]

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

async function getThresholds() {
  const configs = await prisma.systemConfig.findMany({
    where: {
      category: CONFIG_CATEGORY.NOTIFICATION,
      key: { in: [CONFIG_KEY.THRESHOLD_LOW, CONFIG_KEY.THRESHOLD_MEDIUM, CONFIG_KEY.THRESHOLD_HIGH, CONFIG_KEY.EMAILS] },
    },
  })

  const getVal = (key: string, def: number): number => {
    const c = configs.find((x) => x.key === key)
    return c ? parseInt(c.value) || def : def
  }

  const getEmail = (key: string, def: string): string => {
    const c = configs.find((x) => x.key === key)
    return c ? c.value || def : def
  }

  return {
    low: getVal(CONFIG_KEY.THRESHOLD_LOW, 20),
    medium: getVal(CONFIG_KEY.THRESHOLD_MEDIUM, 10),
    high: getVal(CONFIG_KEY.THRESHOLD_HIGH, 5),
    emails: getEmail(CONFIG_KEY.EMAILS, ""),
  }
}

function getPriority(balance: number, thresholds: { low: number; medium: number; high: number }): { priority: NotificationPriority; title: string; message: string } {
  if (balance <= thresholds.high) {
    return {
      priority: NOTIFICATION_PRIORITY.HIGH,
      title: "⚠️ Créditos Factus críticos",
      message: `Quedan solo ${balance} créditos. Se agotarán pronto. Solicita una recarga urgentemente.`,
    }
  }
  if (balance <= thresholds.medium) {
    return {
      priority: NOTIFICATION_PRIORITY.MEDIUM,
      title: "Créditos Factus por agotarse",
      message: `Quedan ${balance} créditos de facturación electrónica. Considera recargar pronto.`,
    }
  }
  if (balance <= thresholds.low) {
    return {
      priority: NOTIFICATION_PRIORITY.LOW,
      title: "Créditos Factus bajando",
      message: `Quedan ${balance} créditos de facturación electrónica.`,
    }
  }
  return {
    priority: NOTIFICATION_PRIORITY.LOW,
    title: "Créditos Factus",
    message: `Saldo actual: ${balance} créditos.`,
  }
}

export async function notifyLowCredit(companyId: string, balanceAfter: number) {
  const thresholds = await getThresholds()
  if (balanceAfter > thresholds.low) return

  const { priority, title, message } = getPriority(balanceAfter, thresholds)

  const users = await prisma.user.findMany({
    where: {
      companyId,
      role: { in: [USER_ROLE.GOD, USER_ROLE.OWNER, USER_ROLE.ADMIN] },
      isActive: true,
    },
    select: { id: true },
  })

  const gods = await prisma.user.findMany({
    where: { role: USER_ROLE.GOD, isActive: true },
    select: { id: true },
  })

  const allUsers = [...new Set([...users, ...gods].map((u) => u.id))]

  for (const userId of allUsers) {
    await sendNotification({
      userId,
      type: `${NOTIFICATION_TYPE.FACTUS_LOW_CREDIT}_${priority.toUpperCase()}`,
      title,
      message,
      metadata: { companyId, balanceAfter, priority },
    })
  }
}

export async function notifyCreditRequested(companyId: string, amount: number) {
  const thresholds = await getThresholds()

  if (thresholds.emails) {
    const emails = thresholds.emails.split(",").map((e: string) => e.trim()).filter(Boolean)
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    })

    for (const email of emails) {
      console.log(`[email] Notificación a ${email}: ${company?.name ?? "Empresa"} solicita activación de ${amount} créditos`)
    }
  }

  const gods = await prisma.user.findMany({
    where: { role: USER_ROLE.GOD, isActive: true },
    select: { id: true },
  })

  for (const god of gods) {
    await sendNotification({
      userId: god.id,
      type: NOTIFICATION_TYPE.FACTUS_CREDIT_REQUESTED,
      title: "Solicitud de activación de créditos",
      message: `Se solicita la activación de ${amount} créditos de facturación electrónica.`,
      metadata: { companyId, amount },
    })
  }
}
