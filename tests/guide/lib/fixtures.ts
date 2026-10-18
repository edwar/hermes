import { request } from "@playwright/test"
import { getGuideVideo } from "../../../lib/guide/content"
import { AUTH_FILES } from "./recorder"

export const WEIGHT_PRODUCT = "Queso Campesino por peso"
export const CUSTOMER = { name: "Cliente Prueba", cedula: "1234567890" }

/** Contenido de un video; falla si el identificador no existe en lib/guide/content.ts. */
export function video(slug: string) {
  const v = getGuideVideo(slug)
  if (!v) throw new Error(`Falta el contenido de ${slug}`)
  return v
}

export const SUPPLIER = { name: "Distribuidora La Esquina", email: "ventas@laesquina.co", phone: "+57 300 555 0101", address: "Carrera 10 # 20-30" }

/** Cliente HTTP con la sesión del administrador, para preparar datos sin grabarlos. */
export async function adminApi() {
  return request.newContext({
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 3101}`,
    storageState: AUTH_FILES.admin,
  })
}

/** Desactiva los productos de ejemplo con ese nombre que hayan quedado de una grabación anterior. */
export async function removeProductsNamed(name: string) {
  const api = await adminApi()
  const res = await api.get(`/api/products?search=${encodeURIComponent(name)}&pageSize=50`)
  const { products = [] } = (await res.json().catch(() => ({}))) as { products?: { id: string; name: string }[] }
  for (const p of products.filter((x) => x.name === name)) await api.delete(`/api/products/${p.id}`)
  await api.dispose()
}

/** Datos del cliente de pruebas del que depende el video de facturación electrónica (ver README). */
export async function restoreFactusSandbox() {
  const url = process.env.E2E_DATABASE_URL
  if (!url) {
    console.warn("[guía] Define E2E_DATABASE_URL para restaurar la empresa de pruebas tras guardar credenciales falsas.")
    return
  }
  const { PrismaClient } = await import("@prisma/client")
  const prisma = new PrismaClient({ datasources: { db: { url } } })
  try {
    await prisma.company.update({
      where: { id: "default-company" },
      data: {
        factusClientId: null,
        factusClientSecretEnc: null,
        factusUsername: null,
        factusPasswordEnc: null,
        factusAccessToken: null,
        factusRefreshToken: null,
        factusTokenExpiresAt: null,
        factusEnabled: true,
        factusCreditBalance: 30,
        // Créditos comprados que el administrador de plataforma debe activar (videos 50 y 51).
        factusCreditPending: 50,
      },
    })
  } finally {
    await prisma.$disconnect()
  }
}

/** Borra los datos de ejemplo que crean los videos, para que una regrabación no encuentre duplicados. */
export async function cleanDemoData() {
  const url = process.env.E2E_DATABASE_URL
  if (!url) {
    console.warn("[guía] Define E2E_DATABASE_URL para limpiar los datos de ejemplo de grabaciones anteriores.")
    return
  }
  const { PrismaClient } = await import("@prisma/client")
  const prisma = new PrismaClient({ datasources: { db: { url } } })
  const attempt = async (what: string, run: () => Promise<unknown>) => {
    try {
      await run()
    } catch (err) {
      console.warn(`[guía] No se pudo limpiar ${what}:`, (err as Error).message.split("\n").pop())
    }
  }
  try {
    await attempt("clientes", () => prisma.customer.deleteMany({ where: { name: "María Gómez" } }))
    await attempt("usuarios", () => prisma.user.deleteMany({ where: { name: "Lucía Ramírez" } }))
    await attempt("proveedores", async () => {
      const suppliers = await prisma.supplier.findMany({ where: { name: SUPPLIER.name }, select: { id: true } })
      const supplierId = { in: suppliers.map((s) => s.id) }
      await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { supplierId } } })
      await prisma.purchaseOrder.deleteMany({ where: { supplierId } })
      await prisma.supplier.deleteMany({ where: { id: supplierId } })
    })
  } finally {
    await prisma.$disconnect()
  }
}
