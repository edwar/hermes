import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { companyScope } from "@/lib/company-scope"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  const sale = await prisma.sale.findFirst({
    where: {
      ...companyScope(session),
      OR: [
        { localId: id },
        { id },
      ],
    },
    include: {
      items: { include: { product: true } },
      user: true,
      customer: true,
    },
  })

  if (!sale) return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 })

  return NextResponse.json(sale)
}
