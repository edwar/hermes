import { z } from "zod"

export const createCustomerSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  cedula: z.string().optional().or(z.literal("")),
})

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  id: z.string(),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
