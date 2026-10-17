// =============================================================================
// EMISIÓN DE DOCUMENTOS ELECTRÓNICOS (FACTURA DE VENTA Y NOTA CRÉDITO)
// Garantías:
//   - Idempotente: el reference_code es estable (`sale-<id>` / `return-<id>`),
//     así que reintentar nunca duplica el documento ante la DIAN.
//   - Un solo intento en vuelo por documento (lease con `nextRetryAt`).
//   - En facturas, el crédito se descuenta solo cuando el documento queda
//     VALIDADO, en la misma transacción que el cambio de estado.
//   - Los pendientes se reintentan con backoff (ver retry.ts) en vez de
//     perderse en silencio.
// =============================================================================

import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { notifyLowCredit } from "@/lib/notifications"
import { AUDIT_ACTION, FACTUS_TRANSACTION_TYPE, FE_STATUS } from "@/lib/constants"
import { getProvider } from "./index"
import type { DocumentKind, SaleForInvoice } from "./provider"

export const MAX_ATTEMPTS = 10
const LEASE_MS = 2 * 60 * 1000
const BACKOFF_BASE_MS = 30 * 1000
const BACKOFF_MAX_MS = 60 * 60 * 1000

export function saleReferenceCode(saleId: string) {
  return `sale-${saleId}`
}

export function returnReferenceCode(returnSaleId: string) {
  return `return-${returnSaleId}`
}

export function backoffMs(attempts: number) {
  return Math.min(BACKOFF_BASE_MS * 2 ** Math.max(attempts - 1, 0), BACKOFF_MAX_MS)
}

export type EmitResult =
  | { status: "skipped"; reason: string }
  | { status: "busy"; invoiceId: string }
  | {
      status: typeof FE_STATUS[keyof typeof FE_STATUS]
      invoiceId: string
      number?: string | null
      cufe?: string | null
      reason?: string | null
    }

/** Factura electrónica de una venta. */
export function emitInvoiceForSale(saleId: string, companyId: string, userId?: string | null) {
  return emitDocument("invoice", saleId, companyId, userId)
}

/** Nota crédito de una devolución (`returnSaleId` es la venta de devolución). */
export function emitCreditNoteForReturn(returnSaleId: string, companyId: string, userId?: string | null) {
  return emitDocument("credit_note", returnSaleId, companyId, userId)
}

async function emitDocument(
  kind: DocumentKind,
  saleId: string,
  companyId: string,
  userId?: string | null
): Promise<EmitResult> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { factusEnabled: true, factusBlocked: true, factusCreditBalance: true },
  })

  if (!company?.factusEnabled) return { status: "skipped", reason: "La empresa no tiene la facturación electrónica habilitada" }
  if (company.factusBlocked) return { status: "skipped", reason: "Facturación electrónica bloqueada para esta empresa" }

  const sale = await prisma.sale.findFirst({
    where: { id: saleId, companyId },
    include: {
      items: { include: { product: true } },
      customer: true,
      company: true,
      parentSale: { include: { electronicInvoice: true } },
    },
  })
  if (!sale) return { status: "skipped", reason: "Venta no encontrada" }

  const isCreditNote = kind === "credit_note"
  const referenceCode = isCreditNote ? returnReferenceCode(sale.id) : saleReferenceCode(sale.id)

  // La nota crédito necesita la factura original ya validada.
  let originalBillNumber = ""
  if (isCreditNote) {
    const original = sale.parentSale?.electronicInvoice
    const validated = original && (original.status === FE_STATUS.VALIDATED || original.status === FE_STATUS.ACCEPTED)
    originalBillNumber = original?.consecutive || original?.factusBillId || ""
    if (!validated || !originalBillNumber || originalBillNumber === "unknown") {
      return { status: "skipped", reason: "La factura original no está validada ante la DIAN" }
    }
  }

  // Un registro por documento; si ya existe, se reutiliza (idempotencia).
  let invoice = await prisma.electronicInvoice.findUnique({ where: { saleId: sale.id } })

  if (invoice && (invoice.status === FE_STATUS.VALIDATED || invoice.status === FE_STATUS.ACCEPTED)) {
    return { status: invoice.status, invoiceId: invoice.id, number: invoice.consecutive, cufe: invoice.cufe }
  }

  if (!invoice) {
    if (!isCreditNote && (company.factusCreditBalance ?? 0) <= 0) {
      return { status: "skipped", reason: "Saldo de créditos de facturación insuficiente" }
    }
    try {
      invoice = await prisma.electronicInvoice.create({
        data: {
          companyId,
          saleId: sale.id,
          referenceCode,
          status: FE_STATUS.PENDING,
          total: sale.total,
          taxTotal: sale.tax,
        },
      })
    } catch (error) {
      // Otra emisión de la misma venta creó el registro entre la lectura y la escritura
      // (saleId es único): se continúa con ese registro y el claim decide quién emite.
      if ((error as { code?: string })?.code !== "P2002") throw error
      invoice = await prisma.electronicInvoice.findUnique({ where: { saleId: sale.id } })
      if (!invoice) throw error
    }
  }

  // --- Reclamar el intento: solo un proceso a la vez por documento ---
  const now = new Date()
  const claimed = await prisma.electronicInvoice.updateMany({
    where: {
      id: invoice.id,
      status: { in: [FE_STATUS.PENDING, FE_STATUS.REJECTED] },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
    },
    data: {
      status: FE_STATUS.PENDING,
      attempts: { increment: 1 },
      lastAttemptAt: now,
      nextRetryAt: new Date(now.getTime() + LEASE_MS),
    },
  })
  if (claimed.count === 0) return { status: "busy", invoiceId: invoice.id }

  const attempts = invoice.attempts + 1
  const ref = invoice.referenceCode ?? referenceCode
  const provider = getProvider(sale.company)
  const outcome = isCreditNote
    ? await provider.issueCreditNote(sale as SaleForInvoice, originalBillNumber, ref)
    : await provider.issueInvoice(sale as SaleForInvoice, ref)

  if (outcome.kind === "validated") {
    let balanceAfter: number | null = null
    let applied = false

    await prisma.$transaction(async (tx) => {
      const updated = await tx.electronicInvoice.updateMany({
        where: { id: invoice!.id, status: { in: [FE_STATUS.PENDING, FE_STATUS.REJECTED] } },
        data: {
          status: FE_STATUS.VALIDATED,
          cufe: outcome.cufe,
          consecutive: outcome.number,
          factusBillId: outcome.providerRef,
          validatedAt: new Date(),
          errorMessage: null,
          nextRetryAt: null,
        },
      })
      if (updated.count === 0) return
      applied = true

      // Solo las facturas consumen crédito de facturación.
      if (isCreditNote) return

      const updatedCompany = await tx.company.update({
        where: { id: companyId },
        data: { factusCreditBalance: { decrement: 1 } },
        select: { factusCreditBalance: true },
      })
      balanceAfter = updatedCompany.factusCreditBalance

      await tx.factusCreditTransaction.create({
        data: {
          companyId,
          type: FACTUS_TRANSACTION_TYPE.CONSUMPTION,
          amount: 1,
          balanceAfter: updatedCompany.factusCreditBalance,
          saleId: sale.id,
          notes: `FE ${outcome.number}`,
        },
      })
    })

    if (applied && isCreditNote) {
      await logAudit({
        userId,
        companyId,
        action: AUDIT_ACTION.FACTUS_CREDIT_NOTE_CREATED,
        entity: "ElectronicInvoice",
        entityId: invoice.id,
        metadata: { billNumber: outcome.number, cufe: outcome.cufe },
      })
    }

    if (applied && balanceAfter !== null) {
      await notifyLowCredit(companyId, balanceAfter)
      await logAudit({
        userId,
        companyId,
        action: AUDIT_ACTION.FACTUS_CREDITS_CONSUMED,
        entity: "Sale",
        entityId: sale.id,
        metadata: { billNumber: outcome.number, balanceAfter },
      })
      await logAudit({
        userId,
        companyId,
        action: AUDIT_ACTION.FACTUS_INVOICE_CREATED,
        entity: "ElectronicInvoice",
        entityId: invoice.id,
        metadata: { billNumber: outcome.number, cufe: outcome.cufe },
      })
    }

    return { status: FE_STATUS.VALIDATED, invoiceId: invoice.id, number: outcome.number, cufe: outcome.cufe }
  }

  if (outcome.kind === "rejected") {
    // Se libera la cola del emisor eliminando el documento rechazado.
    try {
      await provider.discardRejected(companyId, ref, kind)
    } catch (error) {
      console.warn(`[invoicing] no se pudo eliminar el documento rechazado ${ref}:`, error)
    }
    await prisma.electronicInvoice.update({
      where: { id: invoice.id },
      data: { status: FE_STATUS.REJECTED, errorMessage: outcome.reason, nextRetryAt: null },
    })
    return { status: FE_STATUS.REJECTED, invoiceId: invoice.id, reason: outcome.reason }
  }

  // Pendiente: se reintenta con los mismos datos y el mismo reference_code.
  const exhausted = attempts >= MAX_ATTEMPTS
  await prisma.electronicInvoice.update({
    where: { id: invoice.id },
    data: {
      status: FE_STATUS.PENDING,
      errorMessage: exhausted ? `Reintentos agotados: ${outcome.reason}` : outcome.reason,
      consecutive: outcome.number ?? undefined,
      factusBillId: outcome.providerRef ?? undefined,
      nextRetryAt: exhausted ? null : new Date(Date.now() + backoffMs(attempts)),
    },
  })
  return { status: FE_STATUS.PENDING, invoiceId: invoice.id, reason: outcome.reason }
}
