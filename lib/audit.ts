import { prisma } from "@/lib/prisma"
import type { NextRequest } from "next/server"
import { AUDIT_ACTION } from "@/lib/constants"

export type AuditAction = typeof AUDIT_ACTION[keyof typeof AUDIT_ACTION]

export async function logAudit(params: {
  userId?: string | null
  companyId?: string | null
  action: AuditAction
  entity: string
  entityId?: string | null
  metadata?: Record<string, unknown>
  req?: NextRequest
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        companyId: params.companyId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        metadata: params.metadata as any,
        ipAddress: params.req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
          ?? params.req?.headers.get("x-real-ip")
          ?? null,
        userAgent: params.req?.headers.get("user-agent") ?? null,
      },
    })
  } catch (err) {
    console.error("[audit] Error logging action:", err)
  }
}
