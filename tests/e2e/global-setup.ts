// Antes de empezar, espera a que la base de pruebas responda. Neon despierta el cómputo de una rama
// inactiva en unos segundos y la primera consulta puede fallar: sin esto, el primer login de la suite
// se quedaba sin respuesta y fallaba por tiempo.

const ATTEMPTS = 12
const WAIT_MS = 5_000

export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL
  if (!url) return // contra un servidor ya levantado (E2E_BASE_URL) no hay nada que precalentar

  const { PrismaClient } = await import("@prisma/client")
  const prisma = new PrismaClient({ datasources: { db: { url } } })
  try {
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      try {
        await prisma.$queryRaw`SELECT 1`
        return
      } catch (err) {
        if (attempt === ATTEMPTS) throw new Error(`La base de pruebas no responde tras ${ATTEMPTS} intentos: ${(err as Error).message.split("\n").pop()}`)
        await new Promise((resolve) => setTimeout(resolve, WAIT_MS))
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}
