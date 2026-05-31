import { z } from "zod"

export const createStockMovementSchema = z.object({
  type: z.enum(["IN", "OUT"]),
  quantity: z.number().int().min(1, "La cantidad debe ser mayor a 0"),
  reason: z.string().optional(),
  productId: z.string().min(1, "El producto es requerido"),
})

export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>
