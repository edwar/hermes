import { z } from "zod"

export const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
  purchasePrice: z.number().min(0),
})

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, "Debe tener al menos un item"),
})

export const receivePurchaseOrderSchema = z.object({
  id: z.string().min(1),
  items: z.array(purchaseOrderItemSchema).min(1),
})

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>
export type ReceivePurchaseOrderInput = z.infer<typeof receivePurchaseOrderSchema>
