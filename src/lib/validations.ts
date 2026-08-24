import { z } from "zod"

export const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
})

export const CreateDiscountSchema = z.object({
  name: z.string().min(1, { message: "Campaign name is required" }),
  type: z.enum(["PERCENTAGE", "FIXED"], { message: "Invalid discount type" }),
  value: z.number().positive({ message: "Value must be positive" }),
})

export const ManagerOverrideSchema = z.object({
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.number().positive(),
  reason: z.string().min(1, { message: "A reason is required for a manager override." }),
  managerEmail: z.string().email(),
  managerPassword: z.string().min(1),
})

export const OrderItemSchema = z.object({
  serialNumber: z.string().min(1),
  confirmedRam: z.string().optional(),
  confirmedStorage: z.string().optional(),
})

export const CreateOrderSchema = z.object({
  appliedDiscountId: z.string().optional(),
  managerOverride: ManagerOverrideSchema.optional(),
  items: z.array(OrderItemSchema).min(1, { message: "Order must contain at least one item" }),
})
