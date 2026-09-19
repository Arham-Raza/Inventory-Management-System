"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { logAuditAction } from "@/lib/audit"
import { UpsertComponentPriceSchema } from "@/lib/validations"

export async function listComponentPrices() {
  const prices = await prisma.componentPrice.findMany({
    orderBy: [{ type: "asc" }, { label: "asc" }],
  })
  return prices.map((p) => ({
    id: p.id,
    type: p.type,
    label: p.label,
    price: Number(p.price),
  }))
}

export async function upsertComponentPrice(inputData: {
  type: "RAM" | "STORAGE"
  label: string
  price: number
}) {
  const data = UpsertComponentPriceSchema.parse(inputData)

  const session = await auth()
  if (session?.user?.role === "CASHIER" || !session) {
    throw new Error("Unauthorized")
  }

  const label = data.label.trim()
  const record = await prisma.componentPrice.upsert({
    where: { type_label: { type: data.type, label } },
    update: { price: data.price },
    create: { type: data.type, label, price: data.price },
  })

  await logAuditAction(session.user.id, "COMPONENT_PRICE_SET", {
    type: data.type,
    label,
    price: data.price,
  })

  revalidatePath("/component-prices")
  return { id: record.id, type: record.type, label: record.label, price: Number(record.price) }
}

export async function deleteComponentPrice(id: string) {
  const session = await auth()
  if (session?.user?.role === "CASHIER" || !session) {
    throw new Error("Unauthorized")
  }

  const deleted = await prisma.componentPrice.delete({ where: { id } })

  await logAuditAction(session.user.id, "COMPONENT_PRICE_DELETED", {
    type: deleted.type,
    label: deleted.label,
  })

  revalidatePath("/component-prices")
}
