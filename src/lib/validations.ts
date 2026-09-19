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

export const LaptopOrderItemSchema = z.object({
  type: z.literal("LAPTOP"),
  serialNumber: z.string().min(1),
  confirmedRam: z.string().optional(),
  confirmedStorage: z.string().optional(),
})

export const AccessoryOrderItemSchema = z.object({
  type: z.literal("ACCESSORY"),
  accessoryId: z.string().min(1),
  quantity: z.number().int().positive(),
})

export const OrderItemSchema = z.discriminatedUnion("type", [
  LaptopOrderItemSchema,
  AccessoryOrderItemSchema,
])

export const CreateOrderSchema = z.object({
  appliedDiscountId: z.string().optional(),
  managerOverride: ManagerOverrideSchema.optional(),
  customerId: z.string().optional(),
  redeemPoints: z.number().int().nonnegative().optional(),
  items: z.array(OrderItemSchema).min(1, { message: "Order must contain at least one item" }),
})

export const UpsertComponentPriceSchema = z.object({
  type: z.enum(["RAM", "STORAGE"]),
  label: z.string().min(1, { message: "Label is required" }),
  price: z.number().nonnegative({ message: "Price must be zero or positive" }),
})

export const RegisterCustomerSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  phone: z.string().min(6, { message: "Enter a valid phone number" }),
  whatsappOptIn: z.boolean().default(true),
})

export const CreateTechnicianSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  phone: z.string().optional(),
  specialty: z.string().optional(),
})

export const DispatchToRepairSchema = z.object({
  technicianId: z.string().min(1, { message: "Select a technician" }),
  items: z
    .array(
      z.object({
        serialNumber: z.string().min(1),
        remarks: z.string().optional(),
        expectedReturnDate: z.string().optional(),
      })
    )
    .min(1, { message: "Add at least one item to dispatch" }),
})

export const ReturnFromRepairSchema = z.object({
  dispatchId: z.string().min(1),
  cost: z.number().nonnegative({ message: "Cost must be zero or positive" }),
})

export const ReturnTriageOutcomeSchema = z.enum([
  "WARRANTY_CLAIM",
  "RETURN",
  "REPLACEMENT",
  "BUY_BACK",
  "TRADE_IN",
])

export const RecordReturnTriageSchema = z.object({
  serialNumber: z.string().min(1),
  outcome: ReturnTriageOutcomeSchema,
})

export const CreateWarrantyClaimSchema = z.object({
  serialNumber: z.string().min(1),
  stickerPresent: z.boolean(),
  ramHddMatches: z.boolean(),
  chargerReturned: z.boolean(),
  freeGiftsReturned: z.boolean(),
})

export const CreateWalkInJobSchema = z.object({
  jobType: z.enum(["REPAIR", "UPGRADE", "SERVICE"]),
  customerName: z.string().min(1, { message: "Customer name is required" }),
  customerPhone: z.string().optional(),
  deviceDescription: z.string().min(1, { message: "Describe the device" }),
  issueDescription: z.string().min(1, { message: "Describe the issue" }),
  estimatedCost: z.number().nonnegative({ message: "Estimate must be zero or positive" }),
  technicianId: z.string().optional(),
})

export const CompleteWalkInJobSchema = z.object({
  jobId: z.string().min(1),
  actualCost: z.number().nonnegative({ message: "Actual cost must be zero or positive" }),
  shopCost: z.number().nonnegative({ message: "Shop cost must be zero or positive" }),
})
