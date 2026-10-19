// Lectura y escritura de las reglas de permisos (solo las usa el administrador de plataforma).

import { prisma } from "@/lib/prisma"
import type { Role } from "@/lib/navigation"
import { buildMatrix, ruleAction } from "@/lib/permissions/matrix"
import { clearPermissionCache } from "@/lib/permissions"
import { subjectKey, validateRule, type PermissionRuleData } from "@/lib/permissions/resolve"

type DbRule = Awaited<ReturnType<typeof prisma.permissionRule.findMany>>[number]

const toData = (r: DbRule): PermissionRuleData => ({
  scope: r.scope,
  role: r.role as Role | null,
  companyId: r.companyId,
  userId: r.userId,
  module: r.module,
  allowed: r.allowed,
})

/** Reglas que aplican al ver la configuración global o la de una empresa. */
async function rulesForView(companyId: string | null) {
  const rows = await prisma.permissionRule.findMany({
    where: { OR: [{ scope: "GLOBAL" }, ...(companyId ? [{ scope: "COMPANY" as const, companyId }] : [])] },
  })
  return rows.map(toData)
}

export async function getMatrix(companyId: string | null) {
  return buildMatrix(await rulesForView(companyId), companyId)
}

export type SetRuleResult = { ok: true; action: "set" | "remove" } | { ok: false; error: string }

/** Fija si un rol puede usar un módulo en el nivel global o de una empresa. Si coincide con lo heredado, quita la regla. */
export async function setRule(input: {
  companyId: string | null
  role: string
  module: string
  allowed: boolean
}): Promise<SetRuleResult> {
  const scope = input.companyId ? ("COMPANY" as const) : ("GLOBAL" as const)
  const candidate: PermissionRuleData = {
    scope, role: input.role as Role, companyId: input.companyId, userId: null, module: input.module, allowed: input.allowed,
  }
  const invalid = validateRule(candidate)
  if (invalid) return { ok: false, error: invalid }

  if (input.companyId) {
    const company = await prisma.company.findUnique({ where: { id: input.companyId }, select: { id: true } })
    if (!company) return { ok: false, error: "La empresa no existe" }
  }

  const matrix = buildMatrix(await rulesForView(input.companyId), input.companyId)
  const cell = matrix.cells[input.role]?.[input.module]
  if (!cell) return { ok: false, error: "Ese rol o módulo no se puede configurar" }
  if (cell.locked) return { ok: false, error: "Este permiso está bloqueado" }

  const subject = subjectKey(candidate)
  const action = ruleAction(input.allowed, cell.inherited)
  if (action === "remove") {
    await prisma.permissionRule.deleteMany({ where: { subject, module: input.module } })
  } else {
    await prisma.permissionRule.upsert({
      where: { subject_module: { subject, module: input.module } },
      update: { allowed: input.allowed },
      create: { scope, subject, role: candidate.role, companyId: input.companyId, module: input.module, allowed: input.allowed },
    })
  }
  clearPermissionCache()
  return { ok: true, action }
}

/** Quita todas las reglas de un rol en ese nivel: vuelve a lo heredado. Devuelve cuántas quitó. */
export async function resetRole(input: { companyId: string | null; role: string }): Promise<number> {
  const where = input.companyId
    ? { scope: "COMPANY" as const, companyId: input.companyId, role: input.role as Role }
    : { scope: "GLOBAL" as const, role: input.role as Role }
  const { count } = await prisma.permissionRule.deleteMany({ where })
  clearPermissionCache()
  return count
}
