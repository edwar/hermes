import { prisma } from "@/lib/prisma"
import type { PaymentMethod } from "@prisma/client"

interface PaymentMethodMapping {
  factusPaymentForm: number
  factusPaymentMethodCode: string
}

interface SystemConfigMap {
  [key: string]: string
}

let configCache: {
  paymentMethods: Map<string, PaymentMethodMapping>
  systemConfigs: SystemConfigMap
  expiresAt: number
} | null = null

const CACHE_TTL_MS = 60 * 1000

export async function getPaymentMethodConfig(
  companyId: string,
  internalCode: string
): Promise<PaymentMethodMapping> {
  const now = Date.now()

  if (!configCache || configCache.expiresAt < now) {
    const [paymentMethods, systemConfigs] = await Promise.all([
      prisma.paymentMethodConfig.findMany({
        where: { companyId, isActive: true },
        select: { internalCode: true, factusPaymentForm: true, factusPaymentMethodCode: true },
      }),
      prisma.systemConfig.findMany({
        where: { isActive: true },
        select: { key: true, value: true },
      }),
    ])

    configCache = {
      paymentMethods: new Map(paymentMethods.map((pm) => [pm.internalCode, {
        factusPaymentForm: pm.factusPaymentForm,
        factusPaymentMethodCode: pm.factusPaymentMethodCode,
      }])),
      systemConfigs: Object.fromEntries(systemConfigs.map((c) => [c.key, c.value])),
      expiresAt: now + CACHE_TTL_MS,
    }
  }

  return configCache.paymentMethods.get(internalCode) ?? { factusPaymentForm: 1, factusPaymentMethodCode: "10" }
}

export async function getSystemConfig(companyId: string, key: string): Promise<string | null> {
  if (!configCache || configCache.expiresAt < Date.now()) {
    await getPaymentMethodConfig(companyId, "" as PaymentMethod)
  }
  return configCache?.systemConfigs[key] ?? null
}

export function invalidateConfigCache() {
  configCache = null
}