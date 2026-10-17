import type { Company } from "@prisma/client"
import type { InvoiceProvider } from "./provider"
import { factusProvider } from "./factus-provider"

export * from "./provider"

// Hoy todas las empresas usan Factus. Cuando exista otro proveedor se elige
// aquí según un campo de Company (por ejemplo `invoicingProvider`).
export function getProvider(_company: Pick<Company, "id">): InvoiceProvider {
  return factusProvider
}
