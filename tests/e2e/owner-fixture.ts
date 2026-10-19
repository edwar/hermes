import bcrypt from "bcryptjs"

// Un dueño para las pruebas: la empresa de ejemplo no trae uno. Se crea y se borra desde la propia prueba.
export const OWNER = { email: "owner.e2e@hermes.test", password: "Owner2026!", name: "Dueño de prueba" }
const COMPANY_ID = "default-company"

async function withPrisma<T>(run: (prisma: import("@prisma/client").PrismaClient) => Promise<T>): Promise<T> {
  const url = process.env.E2E_DATABASE_URL
  if (!url) throw new Error("Define E2E_DATABASE_URL para crear el dueño de prueba")
  const { PrismaClient } = await import("@prisma/client")
  const prisma = new PrismaClient({ datasources: { db: { url } } })
  try {
    return await run(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

export async function ensureOwner() {
  await withPrisma(async (prisma) => {
    const existing = await prisma.user.findFirst({ where: { email: OWNER.email, companyId: COMPANY_ID } })
    const passwordHash = await bcrypt.hash(OWNER.password, 10)
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: { role: "OWNER", isActive: true, passwordHash } })
    } else {
      await prisma.user.create({ data: { email: OWNER.email, name: OWNER.name, passwordHash, role: "OWNER", companyId: COMPANY_ID } })
    }
  })
}

/** Borra el dueño de prueba (sus reglas personales se borran en cascada) y las reglas de la empresa que dejó la prueba. */
export async function removeOwner() {
  await withPrisma(async (prisma) => {
    await prisma.permissionRule.deleteMany({ where: { scope: "COMPANY", companyId: COMPANY_ID } })
    await prisma.user.deleteMany({ where: { email: OWNER.email, companyId: COMPANY_ID } })
  })
}
