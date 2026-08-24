"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { CreateDiscountSchema } from "@/lib/validations"
import { logAuditAction } from "@/lib/audit"

export async function createDiscountCampaign(inputData: {
  name: string
  type: string
  value: number
}) {
  const data = CreateDiscountSchema.parse(inputData)

  const session = await auth()
  if (session?.user?.role === "CASHIER" || !session) {
    throw new Error("Unauthorized")
  }

  const campaign = await prisma.discountCampaign.create({
    data: {
      name: data.name,
      type: data.type,
      value: data.value,
      isActive: true
    }
  })

  await logAuditAction(session.user.id, "DISCOUNT_CAMPAIGN_CREATED", {
    campaignId: campaign.id,
    name: campaign.name,
    type: campaign.type,
    value: campaign.value,
  })

  revalidatePath('/discounts')
  revalidatePath('/pos')
  // Decimal fields (value) aren't plain objects — can't cross the
  // Server Action → Client Component boundary.
  return { id: campaign.id, name: campaign.name }
}

export async function toggleDiscountCampaign(id: string, isActive: boolean) {
  const session = await auth()
  if (session?.user?.role === "CASHIER" || !session) {
    throw new Error("Unauthorized")
  }

  await prisma.discountCampaign.update({
    where: { id },
    data: { isActive }
  })

  await logAuditAction(session.user.id, "DISCOUNT_CAMPAIGN_TOGGLED", {
    campaignId: id,
    isActive,
  })

  revalidatePath('/discounts')
  revalidatePath('/pos')
}

export async function getActiveDiscounts() {
  return prisma.discountCampaign.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  })
}
