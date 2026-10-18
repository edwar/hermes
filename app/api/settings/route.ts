import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { guardModule } from "@/lib/permissions/guard"
import { prisma, withPrismaRetry } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const companyId = session.user.companyId ?? "default"

  if (session.user.role === "GOD") {
    return NextResponse.json({ storeName: "Sistema", isGod: true })
  }

  let settings = await withPrismaRetry(
    () => prisma.storeSettings.findUnique({ where: { companyId } }),
    "settings:store-find"
  )
  if (!settings) {
    settings = await withPrismaRetry(
      () => prisma.storeSettings.create({ data: { companyId } }),
      "settings:store-create"
    )
  }

  const company = await withPrismaRetry(
    () => prisma.company.findUnique({ where: { id: companyId } }),
    "settings:company-lookup"
  )

  return NextResponse.json({ ...settings, companyName: company?.name })
}

export async function PUT(req: NextRequest) {
  const guard = await guardModule("/settings")
  if ("error" in guard) return guard.error
  const { session } = guard

  const companyId = session.user.companyId ?? "default"

  const body = await req.json()
  const allowed = [
    "storeName", "address", "phone", "nit", "email",
    "currency", "receiptFooter", "taxRate", "logoUrl", "inviteExpiryHours",
  ]

  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) {
      data[key] = key === "taxRate" ? parseFloat(body[key]) : key === "inviteExpiryHours" ? parseInt(body[key]) : body[key]
    }
  }

  const settings = await withPrismaRetry(
    () =>
      prisma.storeSettings.upsert({
        where: { companyId },
        update: data,
        create: { companyId, ...data },
      }),
    "settings:store-upsert"
  )

  const companyData: Record<string, unknown> = {}
  if (body.companyName !== undefined) companyData.name = body.companyName
  if (body.nit !== undefined) companyData.nit = body.nit
  if (body.address !== undefined) companyData.address = body.address
  if (body.phone !== undefined) companyData.phone = body.phone
  if (body.email !== undefined) companyData.email = body.email

  if (Object.keys(companyData).length > 0) {
    await withPrismaRetry(
      () =>
        prisma.company.update({
          where: { id: companyId },
          data: companyData,
        }),
      "settings:company-update"
    )
  }

  return NextResponse.json({ ...settings, ...companyData })
}