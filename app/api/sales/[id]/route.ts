import { NextRequest, NextResponse } from "next/server"
import { guardModule } from "@/lib/permissions/guard"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { companyScope } from "@/lib/company-scope"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await guardModule("/pos")
  if ("error" in guard) return guard.error
  const { session } = guard

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
