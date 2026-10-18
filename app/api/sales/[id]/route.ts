import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { denyUnlessModule } from "@/lib/api-access"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { companyScope } from "@/lib/company-scope"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const denied = denyUnlessModule(session, "/pos")
  if (denied) return denied

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const includeElectronicInvoice = searchParams.get("includeElectronicInvoice") === "true"

  const sale = await withPrismaRetry(
    () =>
      prisma.sale.findFirst({
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
          electronicInvoice: includeElectronicInvoice || false,
          returns: {
            include: { items: true },
          },
        },
      }),
    "sales:get-by-id"
  )

  if (!sale) return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 })

  return NextResponse.json(sale)
}
