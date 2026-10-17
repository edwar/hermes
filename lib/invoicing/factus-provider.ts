// =============================================================================
// ADAPTADOR DE FACTUS
// Reglas de la documentación de Factus que se respetan aquí:
//   - reference_code estable: reenviarlo devuelve el documento existente.
//   - Solo se elimina un documento RECHAZADO ("Rechazo" en data.errors).
//   - Una demora de la DIAN (is_validated=false sin rechazo) NO se elimina:
//     se reenvía lo mismo y la API consulta el estado sin duplicar.
//   - 409 = hay un documento pendiente por enviar a la DIAN en el emisor.
// =============================================================================

import { HTTP_METHOD, FACTUS_DOCUMENT_TYPE } from "@/lib/constants"
import {
  FactusApiError,
  FactusNotConfiguredError,
  factusRequest,
  getInvoice,
  getNumberingRangeByDocumentType,
  listNumberingRanges,
} from "@/lib/factus/client"
import { mapSaleToFactusCreditNote, mapSaleToFactusInvoice } from "@/lib/factus/mappers"
import type { DocumentKind, InvoiceProvider, IssueOutcome, SaleForInvoice } from "./provider"

interface FactusBillResponse {
  status?: string
  message?: string
  data?: {
    reference_code?: string
    number?: string
    cufe?: string
    is_validated?: boolean
    validated_at?: string | null
    errors?: Record<string, unknown> | string[] | null
  }
}

function errorsToText(errors: unknown): string {
  if (!errors) return ""
  if (typeof errors === "string") return errors
  if (Array.isArray(errors)) return errors.map(String).join("; ")
  if (typeof errors === "object") {
    return Object.entries(errors as Record<string, unknown>)
      .map(([code, msg]) => `${code}: ${typeof msg === "string" ? msg : JSON.stringify(msg)}`)
      .join("; ")
  }
  return String(errors)
}

// Distingue un rechazo de una simple notificación de la DIAN.
export function isRejection(errorsText: string): boolean {
  return errorsText.toLowerCase().includes("rechazo")
}

// Envía un documento a Factus y lo traduce a un resultado neutral.
async function submitDocument(companyId: string, endpoint: string, payload: object, referenceCode: string): Promise<IssueOutcome> {
  let response: FactusBillResponse
  try {
    response = await factusRequest<FactusBillResponse>(
      endpoint,
      { method: HTTP_METHOD.POST, body: JSON.stringify(payload) },
      companyId
    )
  } catch (error) {
    if (error instanceof FactusNotConfiguredError) {
      return { kind: "rejected", reason: error.message }
    }
    if (error instanceof FactusApiError) {
      if (error.statusCode === 409) {
        return { kind: "pending", reason: "Factus tiene un documento pendiente por enviar a la DIAN" }
      }
      // Errores de validación o de datos: reintentar igual no sirve.
      if (error.statusCode >= 400 && error.statusCode < 500 && ![401, 408, 429].includes(error.statusCode)) {
        const fieldErrors = (error.factusData as { data?: { errors?: unknown } } | undefined)?.data?.errors ?? error.details
        const detail = fieldErrors ? `: ${errorsToText(fieldErrors)}` : ""
        return { kind: "rejected", reason: `${error.message}${detail}` }
      }
      return { kind: "pending", reason: `Factus respondió ${error.statusCode}: ${error.message}` }
    }
    return { kind: "pending", reason: error instanceof Error ? error.message : "Error de red con Factus" }
  }

  const data = response.data ?? {}
  const errorsText = errorsToText(data.errors)

  if (data.is_validated === true) {
    return {
      kind: "validated",
      number: data.number ?? "",
      cufe: data.cufe,
      providerRef: data.number ?? referenceCode,
      raw: response,
    }
  }

  if (isRejection(errorsText)) {
    return { kind: "rejected", reason: errorsText }
  }

  return {
    kind: "pending",
    reason: errorsText || "Pendiente de validación por la DIAN",
    number: data.number,
    providerRef: data.number,
  }
}

export const factusProvider: InvoiceProvider = {
  name: "factus",

  async issueInvoice(sale: SaleForInvoice, referenceCode: string): Promise<IssueOutcome> {
    const range = await getNumberingRangeByDocumentType(sale.companyId, FACTUS_DOCUMENT_TYPE.SALES_INVOICE)
    const payload = await mapSaleToFactusInvoice(sale, range?.factusRangeId, referenceCode)
    return submitDocument(sale.companyId, "/v2/bills/validate", payload, referenceCode)
  },

  async issueCreditNote(returnSale: SaleForInvoice, originalBillNumber: string, referenceCode: string): Promise<IssueOutcome> {
    const companyId = returnSale.companyId

    let rangeId: number | undefined
    try {
      const raw = await listNumberingRanges(companyId, { document: FACTUS_DOCUMENT_TYPE.CREDIT_NOTE })
      const inner = (raw as { data?: unknown })?.data
      const ranges = (Array.isArray(inner) ? inner : (inner as { data?: unknown[] } | undefined)?.data ?? []) as {
        id: number
        is_active?: boolean | number
      }[]
      rangeId = ranges.find((r) => r.is_active === true || r.is_active === 1)?.id
    } catch (error) {
      if (error instanceof FactusNotConfiguredError) return { kind: "rejected", reason: error.message }
      return { kind: "pending", reason: "No se pudo consultar el rango de numeración de notas crédito" }
    }
    if (!rangeId) {
      return { kind: "rejected", reason: "No hay un rango de numeración activo para notas crédito en Factus" }
    }

    // El id interno de la factura original es opcional; sin él se envía solo bill_number.
    let originalBillId: number | undefined
    try {
      const original = (await getInvoice(originalBillNumber, companyId)) as { data?: { id?: number }; id?: number }
      const id = Number(original?.data?.id ?? original?.id)
      originalBillId = Number.isNaN(id) ? undefined : id
    } catch {
      originalBillId = undefined
    }

    const payload = await mapSaleToFactusCreditNote(returnSale, originalBillNumber, rangeId, referenceCode, 1, originalBillId)
    return submitDocument(companyId, "/v2/credit-notes/validate", payload, referenceCode)
  },

  async discardRejected(companyId: string, referenceCode: string, kind: DocumentKind): Promise<void> {
    const path =
      kind === "credit_note"
        ? `/v2/credit-notes/reference/${encodeURIComponent(referenceCode)}`
        : `/v2/bills/destroy/reference/${encodeURIComponent(referenceCode)}`
    try {
      await factusRequest(path, { method: HTTP_METHOD.DELETE }, companyId)
    } catch (error) {
      // 404: Factus rechazó el documento antes de guardarlo, no hay nada que liberar.
      if (error instanceof FactusApiError && error.statusCode === 404) return
      throw error
    }
  },
}
