"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export type InventoryLookupResult = {
  serialNumber: string
  modelName: string
  processor: string
  gpu: string
  ram: string
  storage: string
  retailPrice: number
  status: string
}

export async function lookupInventoryItem(
  serialNumber: string
): Promise<InventoryLookupResult | null> {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const item = await prisma.inventoryItem.findUnique({
    where: { serialNumber },
    select: {
      serialNumber: true,
      modelName: true,
      processor: true,
      gpu: true,
      ram: true,
      storage: true,
      retailPrice: true,
      status: true,
    },
  })

  if (!item) return null

  return {
    ...item,
    // Decimal → number so the plain object is serialisable for the client
    retailPrice: Number(item.retailPrice),
  }
}
