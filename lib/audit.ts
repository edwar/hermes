import { prisma } from "@/lib/prisma"
import type { NextRequest } from "next/server"

export type AuditAction =
  | "USER_CREATED" | "USER_UPDATED" | "USER_ROLE_CHANGED"
  | "USER_DEACTIVATED" | "USER_REACTIVATED" | "USER_PASSWORD_RESET"
  | "COMPANY_CREATED" | "COMPANY_UPDATED" | "COMPANY_DEACTIVATED"
  | "COMPANY_FACTUS_BLOCKED" | "COMPANY_FACTUS_UNBLOCKED"
  | "INVITE_CREATED" | "INVITE_USED" | "INVITE_DELETED"
  | "FACTUS_CREDITS_PURCHASED" | "FACTUS_CREDITS_CONSUMED"
  | "FACTUS_INVOICE_CREATED" | "FACTUS_CREDIT_NOTE_CREATED"
  | "CASH_SESSION_OPENED" | "CASH_SESSION_CLOSED"
  | "CASH_MOVEMENT_CREATED" | "CASH_REGISTER_CREATED"

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
