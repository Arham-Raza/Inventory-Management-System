"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import {
  RecordReturnTriageSchema,
  CreateWarrantyClaimSchema,
} from "@/lib/validations"

function assertCanManage(role: string | undefined) {
  if (!role || role === "CASHIER" || role === "DATA_ENTRY") {
    throw new Error("Unauthorized")
  }
}

// ── POS-facing: the return-triage prompt and warranty intake ────────────────
// Both run from the cashier's own POS terminal, at the moment a previously-
// sold serial is scanned back in — any authenticated staff member can use them.

// The four non-warranty outcomes don't have a dedicated workflow yet — this
// just records which one staff picked, for later reference.
export async function recordReturnTriage(inputData: { serialNumber: string; outcome: string }) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const data = RecordReturnTriageSchema.parse(inputData)

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "RETURN_TRIAGE_RECORDED",
      details: { serialNumber: data.serialNumber, outcome: data.outcome },
    },
  })
}

export async function createWarrantyClaim(inputData: {
  serialNumber: string
  stickerPresent: boolean
  ramHddMatches: boolean
  chargerReturned: boolean
  freeGiftsReturned: boolean
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const data = CreateWarrantyClaimSchema.parse(inputData)
  const userId = session.user.id

  const claim = await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { serialNumber: data.serialNumber } })
    if (!item) throw new Error("Item not found.")
    if (item.status !== "SOLD") {
      throw new Error(`"${item.modelName}" is currently ${item.status}, not SOLD — it can't be taken in for warranty.`)
    }

    const created = await tx.warrantyClaim.create({
      data: {
        serialNumber: data.serialNumber,
        stickerPresent: data.stickerPresent,
        ramHddMatches: data.ramHddMatches,
        chargerReturned: data.chargerReturned,
        freeGiftsReturned: data.freeGiftsReturned,
        receivedById: userId,
      },
      include: { inventoryItem: true },
    })

    const updated = await tx.inventoryItem.updateMany({
      where: { serialNumber: data.serialNumber, status: "SOLD" },
      data: { status: "IN_WARRANTY" },
    })
    if (updated.count === 0) {
      throw new Error(`Concurrency conflict: "${data.serialNumber}" changed status before the claim completed.`)
    }

    return created
  })

  revalidatePath("/warranty")
  revalidatePath("/inventory")

  return {
    id: claim.id,
    serialNumber: claim.serialNumber,
    modelName: claim.inventoryItem.modelName,
    processor: claim.inventoryItem.processor,
    ram: claim.inventoryItem.ram,
    storage: claim.inventoryItem.storage,
    stickerPresent: claim.stickerPresent,
    ramHddMatches: claim.ramHddMatches,
    chargerReturned: claim.chargerReturned,
    freeGiftsReturned: claim.freeGiftsReturned,
    createdAt: claim.createdAt.toISOString(),
  }
}

// ── Back-office Warranty tab (SUPER_ADMIN / MANAGER) ────────────────────────

export async function listActiveWarrantyClaims() {
  const session = await auth()
  assertCanManage(session?.user?.role)

  const claims = await prisma.warrantyClaim.findMany({
    where: { status: "RECEIVED" },
    include: { inventoryItem: { select: { modelName: true, serialNumber: true } } },
    orderBy: { createdAt: "asc" },
  })

  return claims.map((c) => ({
    id: c.id,
    serialNumber: c.serialNumber,
    modelName: c.inventoryItem.modelName,
    stickerPresent: c.stickerPresent,
    ramHddMatches: c.ramHddMatches,
    chargerReturned: c.chargerReturned,
    freeGiftsReturned: c.freeGiftsReturned,
    receivedAt: c.createdAt.toISOString(),
  }))
}

export async function settleWarrantyClaim(claimId: string) {
  const session = await auth()
  assertCanManage(session?.user?.role)
  const userId = session!.user!.id!

  await prisma.$transaction(async (tx) => {
    const claim = await tx.warrantyClaim.findUnique({ where: { id: claimId } })
    if (!claim || claim.status !== "RECEIVED") {
      throw new Error("This claim is not currently active.")
    }

    await tx.warrantyClaim.update({
      where: { id: claimId },
      data: { status: "SETTLED", settledAt: new Date(), settledById: userId },
    })

    // Repaired and shipped back to the customer — ownership reverts to what
    // it was before the claim, so a second warranty cycle on this serial
    // (if it comes back again) triages the same way as the first.
    const updated = await tx.inventoryItem.updateMany({
      where: { serialNumber: claim.serialNumber, status: "IN_WARRANTY" },
      data: { status: "SOLD" },
    })
    if (updated.count === 0) {
      throw new Error(`Concurrency conflict: "${claim.serialNumber}" is no longer marked IN_WARRANTY.`)
    }
  })

  revalidatePath("/warranty")
  revalidatePath("/inventory")
}

export async function returnWarrantyClaimToStock(claimId: string) {
  const session = await auth()
  assertCanManage(session?.user?.role)
  const userId = session!.user!.id!

  await prisma.$transaction(async (tx) => {
    const claim = await tx.warrantyClaim.findUnique({ where: { id: claimId } })
    if (!claim || claim.status !== "RECEIVED") {
      throw new Error("This claim is not currently active.")
    }

    await tx.warrantyClaim.update({
      where: { id: claimId },
      data: { status: "RETURNED_TO_STOCK", settledAt: new Date(), settledById: userId },
    })

    // Existing cost/price history is left untouched — an admin can re-price
    // it manually from the Inventory Ledger if this unit needs a lower
    // valuation as "twice-refurbished" stock.
    const updated = await tx.inventoryItem.updateMany({
      where: { serialNumber: claim.serialNumber, status: "IN_WARRANTY" },
      data: { status: "AVAILABLE" },
    })
    if (updated.count === 0) {
      throw new Error(`Concurrency conflict: "${claim.serialNumber}" is no longer marked IN_WARRANTY.`)
    }
  })

  revalidatePath("/warranty")
  revalidatePath("/inventory")
}

export async function getWarrantyReport(fromISO: string, toISO: string) {
  const session = await auth()
  assertCanManage(session?.user?.role)

  const from = new Date(fromISO)
  const to = new Date(toISO)

  const claims = await prisma.warrantyClaim.findMany({
    where: { createdAt: { gte: from, lte: to } },
  })

  return {
    received: claims.length,
    settled: claims.filter((c) => c.status === "SETTLED").length,
    returnedToStock: claims.filter((c) => c.status === "RETURNED_TO_STOCK").length,
    stillActive: claims.filter((c) => c.status === "RECEIVED").length,
  }
}
