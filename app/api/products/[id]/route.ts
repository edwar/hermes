import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { guardModule } from "@/lib/permissions/guard"
import { prisma, withPrismaRetry } from "@/lib/prisma"
import { companyScope } from "@/lib/company-scope"
import { updateProductSchema } from "@/features/inventory/schemas/product-schema"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const product = await withPrismaRetry(
    () =>
      prisma.product.findUnique({
        where: { id, ...companyScope(session) },
        include: { category: true },
      }),
    "products:get"
  )

  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
  return NextResponse.json(product)
}

// El cliente (use-products.ts) actualiza y elimina por /api/products/:id; antes solo existían
// PUT/DELETE en la ruta de colección, así que editar y eliminar respondían 405.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await guardModule("/inventory")
  if ("error" in guard) return guard.error
  const { session } = guard

  const { id } = await params
  const parsed = updateProductSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const exists = await withPrismaRetry(
    () => prisma.product.findFirst({ where: { id, ...companyScope(session) }, select: { id: true } }),
    "products:update-lookup"
  )
  if (!exists) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })

  const product = await withPrismaRetry(
    () => prisma.product.update({ where: { id }, data: parsed.data }),
    "products:update"
  )
  return NextResponse.json(product)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await guardModule("/inventory")
  if ("error" in guard) return guard.error
  const { session } = guard
  // Eliminar productos no está permitido al Gestor (regla fija, aunque pueda editarlos).
  if (session.user.role === "MANAGER") return NextResponse.json({ error: "No tienes permiso" }, { status: 403 })

  const { id } = await params
  const exists = await withPrismaRetry(
    () => prisma.product.findFirst({ where: { id, ...companyScope(session) }, select: { id: true } }),
    "products:deactivate-lookup"
  )
  if (!exists) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })

  // Se desactiva en vez de borrar: conserva el historial de ventas.
  await withPrismaRetry(
    () => prisma.product.update({ where: { id }, data: { isActive: false } }),
    "products:deactivate"
  )
  return NextResponse.json({ success: true })
}
