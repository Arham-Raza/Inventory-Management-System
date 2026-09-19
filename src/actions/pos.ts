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

export type AccessoryScanResult = {
  accessoryId: string
  barcode: string
  name: string
  sellingPrice: number
  quantityInStock: number
}

export type ScanResult =
  | ({ kind: "LAPTOP" } & InventoryLookupResult)
  | ({ kind: "ACCESSORY" } & AccessoryScanResult)
  | { kind: "NOT_FOUND" }

// Single lookup used by the POS scanner: a laptop's serial number and an
// accessory's barcode are both just "whatever the scanner typed", so the
// cashier shouldn't need to know which kind of item they're holding before
// scanning it. Laptops are checked first since serials are only ever
// laptop-specific, so a matching barcode can never collide with one.
export async function scanBarcode(code: string): Promise<ScanResult> {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const trimmed = code.trim()

  const laptop = await prisma.inventoryItem.findUnique({
    where: { serialNumber: trimmed },
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
  if (laptop) {
    return { kind: "LAPTOP", ...laptop, retailPrice: Number(laptop.retailPrice) }
  }

  const accessory = await prisma.accessory.findUnique({ where: { barcode: trimmed } })
  if (accessory) {
    return {
      kind: "ACCESSORY",
      accessoryId: accessory.id,
      barcode: accessory.barcode,
      name: accessory.name,
      sellingPrice: Number(accessory.sellingPrice),
      quantityInStock: accessory.quantity,
    }
  }

  return { kind: "NOT_FOUND" }
}
