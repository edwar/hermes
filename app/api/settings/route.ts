import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const companyId = session.user.companyId ?? "default"

  let settings = await prisma.storeSettings.findUnique({ where: { companyId } })
  if (!settings) {
    settings = await prisma.storeSettings.create({ data: { companyId } })
  }

  return NextResponse.json(settings)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

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

  const settings = await prisma.storeSettings.upsert({
    where: { companyId },
    update: data,
    create: { companyId, ...data },
  })

  return NextResponse.json(settings)
}