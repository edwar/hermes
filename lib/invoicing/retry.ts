// =============================================================================
// REINTENTO DE FACTURAS PENDIENTES
// Factus no tiene webhooks y la DIAN puede demorar, así que las facturas en
// PENDING se reenvían con los mismos datos hasta quedar validadas o rechazadas.
// Por empresa se procesan en orden y se frena en la primera que siga pendiente,
// porque Factus no admite documentos nuevos mientras haya uno por enviar.
// =============================================================================

import { prisma } from "@/lib/prisma"
import { FE_STATUS } from "@/lib/constants"
import { emitCreditNoteForReturn, emitInvoiceForSale, MAX_ATTEMPTS } from "./emit"

export interface RetrySummary {
  checked: number
  validated: number
  rejected: number
  stillPending: number
}

export async function retryPendingInvoices(options: { companyId?: string; limit?: number } = {}): Promise<RetrySummary> {
  const summary: RetrySummary = { checked: 0, validated: 0, rejected: 0, stillPending: 0 }

  const due = await prisma.electronicInvoice.findMany({
    where: {
      status: FE_STATUS.PENDING,
      saleId: { not: null },
      attempts: { lt: MAX_ATTEMPTS },
      nextRetryAt: { lte: new Date() },
      ...(options.companyId ? { companyId: options.companyId } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: options.limit ?? 50,
    select: { id: true, saleId: true, companyId: true, sale: { select: { isReturn: true } } },
  })

  const blockedCompanies = new Set<string>()

  for (const invoice of due) {
    if (blockedCompanies.has(invoice.companyId) || !invoice.saleId) continue
    summary.checked++

    const result = invoice.sale?.isReturn
      ? await emitCreditNoteForReturn(invoice.saleId, invoice.companyId)
      : await emitInvoiceForSale(invoice.saleId, invoice.companyId)

    if (result.status === FE_STATUS.VALIDATED) summary.validated++
    else if (result.status === FE_STATUS.REJECTED) summary.rejected++
    else {
      summary.stillPending++
      blockedCompanies.add(invoice.companyId)
    }
  }

  return summary
}

/**
 * Reinicia el contador de intentos y reintenta ahora mismo las facturas
 * pendientes o rechazadas de una empresa (acción manual desde la interfaz).
 */
export async function forceRetryCompany(companyId: string): Promise<RetrySummary> {
  await prisma.electronicInvoice.updateMany({
    where: { companyId, status: { in: [FE_STATUS.PENDING] }, saleId: { not: null } },
    data: { attempts: 0, nextRetryAt: new Date() },
  })
  return retryPendingInvoices({ companyId })
}
