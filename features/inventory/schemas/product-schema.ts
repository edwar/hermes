import { z } from "zod"

export const createProductSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  barcode: z.string().optional(),
  description: z.string().optional(),
  purchasePrice: z.number().min(0, "El precio de compra no puede ser negativo"),
  profitMargin: z.number().min(0).default(0.30),
  stock: z.number().int().min(0, "El stock no puede ser negativo"),
  minStock: z.number().int().min(0).default(5),
  categoryId: z.string().min(1, "La categoría es requerida"),
  imageUrl: z.string().optional(),
  sellByWeight: z.boolean().optional().default(false),
  weightUnit: z.enum(["g", "kg", "lb"]).optional().default("g"),
})

export const updateProductSchema = createProductSchema.partial()

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
