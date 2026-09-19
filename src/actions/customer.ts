"use server"

import { z } from "zod"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { RegisterCustomerSchema } from "@/lib/validations"
import { sendWhatsAppMessage } from "@/lib/whatsapp"

export type CustomerSummary = {
  id: string
  name: string
  phone: string
  points: number
}

export async function lookupCustomerByPhone(phone: string): Promise<CustomerSummary | null> {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const trimmed = phone.trim()
  if (!trimmed) return null

  const customer = await prisma.customer.findUnique({
    where: { phone: trimmed },
    select: { id: true, name: true, phone: true, points: true },
  })

  return customer
}

export async function registerCustomer(
  input: z.infer<typeof RegisterCustomerSchema>
): Promise<CustomerSummary> {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const data = RegisterCustomerSchema.parse(input)
  const phone = data.phone.trim()

  const existing = await prisma.customer.findUnique({ where: { phone } })
  if (existing) {
    throw new Error("A customer with this phone number is already registered.")
  }

  const customer = await prisma.customer.create({
    data: {
      name: data.name.trim(),
      phone,
      whatsappOptIn: data.whatsappOptIn,
    },
  })

  if (customer.whatsappOptIn) {
    await sendWhatsAppMessage(
      customer.phone,
      `Welcome to TechRevalo, ${customer.name}! You're now registered for our loyalty program. Earn points on every purchase and redeem them in-store.`
    )
  }

  return { id: customer.id, name: customer.name, phone: customer.phone, points: customer.points }
}
