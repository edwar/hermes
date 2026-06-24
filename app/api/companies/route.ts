import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { USER_ROLE, AUDIT_ACTION, SORT_DIRECTION } from "@/lib/constants"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== USER_ROLE.GOD) return NextResponse.json({ error: "Solo GOD puede ver empresas" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""

  const companies = await withPrismaRetry(
    () =>
      prisma.company.findMany({
        where: search ? { name: { contains: search, mode: "insensitive" } } : {},
        orderBy: { createdAt: SORT_DIRECTION.DESC },
        select: {
          id: true, name: true, nit: true, address: true, phone: true, email: true,
          isActive: true, createdAt: true, updatedAt: true,
          factusEnabled: true, factusCreditBalance: true, factusCreditPending: true, factusCreditTotal: true, factusBlocked: true,
          _count: { select: { users: true } },
        },
      }),
    "companies:list"
  )

  return NextResponse.json(companies)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== USER_ROLE.GOD) return NextResponse.json({ error: "Solo GOD puede editar empresas" }, { status: 403 })

  const body = await req.json()
  const { id, name, nit, address, phone, email, isActive, factusBlocked } = body

  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  const existingCompany = await withPrismaRetry(
    () => prisma.company.findUnique({ where: { id }, select: { factusBlocked: true } }),
    "companies:fetch-existing"
  )

  if (!existingCompany) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })
  }

  const updateData: Record<string, unknown> = { name, nit, address, phone, email, isActive }
  if (typeof factusBlocked === "boolean") updateData.factusBlocked = factusBlocked

  const company = await withPrismaRetry(
    () =>
      prisma.company.update({
        where: { id },
        data: updateData,
      }),
    "companies:update"
  )

  const changedFields: Record<string, unknown> = {}
  if (name !== undefined) changedFields.name = name
  if (nit !== undefined) changedFields.nit = nit
  if (address !== undefined) changedFields.address = address
  if (phone !== undefined) changedFields.phone = phone
  if (email !== undefined) changedFields.email = email
  if (isActive !== undefined) changedFields.isActive = isActive

  if (factusBlocked !== undefined) {
    if (factusBlocked && !existingCompany.factusBlocked) {
      await logAudit({
        userId: session.user.id, companyId: session.user.companyId,       action: AUDIT_ACTION.COMPANY_FACTUS_BLOCKED,
        entity: "Company", entityId: id, req,
      })
    } else if (!factusBlocked && existingCompany.factusBlocked) {
      await logAudit({
        userId: session.user.id, companyId: session.user.companyId,       action: AUDIT_ACTION.COMPANY_FACTUS_UNBLOCKED,
        entity: "Company", entityId: id, req,
      })
    }
  }

  await logAudit({
    userId: session.user.id, companyId: session.user.companyId,     action: AUDIT_ACTION.COMPANY_UPDATED,
    entity: "Company", entityId: id, metadata: changedFields, req,
  })

  return NextResponse.json(company)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== USER_ROLE.GOD) return NextResponse.json({ error: "Solo GOD puede eliminar empresas" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  await withPrismaRetry(
    () => prisma.company.update({ where: { id }, data: { isActive: false } }),
    "companies:deactivate"
  )

  await logAudit({
    userId: session.user.id, companyId: session.user.companyId,     action: AUDIT_ACTION.COMPANY_DEACTIVATED,
    entity: "Company", entityId: id, req,
  })

  return NextResponse.json({ message: "Empresa desactivada" })
}
