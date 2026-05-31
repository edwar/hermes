import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createCategorySchema } from "@/features/inventory/schemas/category-schema"
import { companyScope } from "@/lib/company-scope"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const where = { isActive: true, ...companyScope(session) }

  const categories = await prisma.category.findMany({
    where,
    orderBy: { name: "asc" },
  })
  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!session.user.companyId) {
    return NextResponse.json({ error: "No tienes una empresa asignada" }, { status: 400 })
  }

  const body = await req.json()
  const parsed = createCategorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const category = await prisma.category.create({
    data: { ...parsed.data, companyId: session.user.companyId },
  })
  return NextResponse.json(category, { status: 201 })
}