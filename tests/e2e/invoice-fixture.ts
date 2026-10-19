// Una factura electrónica de ejemplo para las pruebas de la tabla de documentos. Una base recién sembrada
// no trae ninguna, y emitir una de verdad exige Factus; se inserta directamente y se borra al terminar.

const COMPANY_ID = "default-company"
const REFERENCE = "e2e-fixture-invoice"

async function withPrisma<T>(run: (prisma: import("@prisma/client").PrismaClient) => Promise<T>): Promise<T> {
  const url = process.env.E2E_DATABASE_URL
  if (!url) throw new Error("Define E2E_DATABASE_URL para crear la factura de ejemplo")
  const { PrismaClient } = await import("@prisma/client")
  const prisma = new PrismaClient({ datasources: { db: { url } } })
  try {
    return await run(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

export async function ensureSampleInvoice() {
  await withPrisma(async (prisma) => {
    const exists = await prisma.electronicInvoice.findFirst({ where: { referenceCode: REFERENCE } })
    if (exists) return
    await prisma.electronicInvoice.create({
      data: {
        companyId: COMPANY_ID,
        status: "VALIDATED",
        consecutive: "E2E-0001",
        cufe: "e2e-cufe-de-ejemplo",
        total: 11900,
        taxTotal: 1900,
        validatedAt: new Date(),
        referenceCode: REFERENCE,
      },
    })
  })
}

export async function removeSampleInvoice() {
  await withPrisma(async (prisma) => {
    await prisma.electronicInvoice.deleteMany({ where: { referenceCode: REFERENCE } })
  })
}
