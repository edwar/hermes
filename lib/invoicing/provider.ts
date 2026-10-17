// =============================================================================
// INTERFAZ DE PROVEEDOR DE FACTURACIÓN ELECTRÓNICA
// Aísla a Hermes del proveedor tecnológico (hoy Factus). Si se cambia de
// proveedor, solo hay que escribir otro adaptador que cumpla esta interfaz.
// =============================================================================

import type { Sale, SaleItem, Customer, Company, Product } from "@prisma/client"

export type SaleForInvoice = Sale & {
  items: (SaleItem & { product: Product })[]
  customer: Customer | null
  company: Company
}

export type IssueOutcome =
  // El proveedor y la DIAN validaron el documento.
  | { kind: "validated"; number: string; cufe?: string; providerRef: string; raw: unknown }
  // Sin respuesta definitiva (demora de la DIAN o cola ocupada): reintentar con los mismos datos.
  | { kind: "pending"; reason: string; number?: string; providerRef?: string }
  // Rechazo definitivo: hay que corregir los datos y volver a emitir.
  | { kind: "rejected"; reason: string }

export type DocumentKind = "invoice" | "credit_note"

export interface InvoiceProvider {
  readonly name: string

  /**
   * Emite una factura de venta. Debe ser idempotente respecto a `referenceCode`:
   * reenviar el mismo código nunca debe crear un documento duplicado.
   */
  issueInvoice(sale: SaleForInvoice, referenceCode: string): Promise<IssueOutcome>

  /**
   * Emite la nota crédito de una devolución contra una factura ya validada.
   * Idempotente respecto a `referenceCode`, igual que `issueInvoice`.
   */
  issueCreditNote(returnSale: SaleForInvoice, originalBillNumber: string, referenceCode: string): Promise<IssueOutcome>

  /** Elimina un documento NO validado (solo tras un rechazo) para liberar la cola del emisor. */
  discardRejected(companyId: string, referenceCode: string, kind: DocumentKind): Promise<void>
}
