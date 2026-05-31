import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { companyScope } from "@/lib/company-scope"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id, ...companyScope(session) },
    include: { category: true },
  })

  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
  return NextResponse.json(product)
}
