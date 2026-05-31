import { z } from "zod"

export const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  subtotal: z.number().min(0),
})

export const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Debe tener al menos un item"),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  discount: z.number().min(0).default(0),
  total: z.number().min(0),
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER", "CREDIT"]),
  sessionId: z.string().optional(),
  customerId: z.string().optional(),
  notes: z.string().optional(),
  localId: z.string().optional(),
  requestElectronicInvoice: z.boolean().optional(),
})

export type CreateSaleInput = z.infer<typeof createSaleSchema>
export type SaleItemInput = z.infer<typeof saleItemSchema>
