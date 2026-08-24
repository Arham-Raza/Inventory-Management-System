"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { calculateOrderTotals } from "@/lib/money"
import { CreateOrderSchema } from "@/lib/validations"

type OrderItemInput = {
  serialNumber: string
  // Confirmed specs at checkout time — may differ from DB if unit was reconfigured
  confirmedRam?: string
  confirmedStorage?: string
}

type ManagerOverrideInput = {
  type: "PERCENTAGE" | "FIXED"
  value: number
  reason: string
  managerEmail: string
  managerPassword: string
}

export type CreateOrderInput = {
  appliedDiscountId?: string
  managerOverride?: ManagerOverrideInput
  items: OrderItemInput[]
}

export async function createOrder(inputData: CreateOrderInput) {
  const data = CreateOrderSchema.parse(inputData)

  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const cashierId = session.user.id

  if (data.appliedDiscountId && data.managerOverride) {
    throw new Error("Cannot apply both a promotion and a manager override on the same order.")
  }

  // Verified outside the transaction — bcrypt is CPU-bound and shouldn't hold a DB lock open.
  // Credentials are checked here, at the moment of checkout, not trusted from an earlier step,
  // so manualDiscountById always names whoever actually authorized this specific order.
  let manualDiscount: { type: string; value: number; reason: string; byUserId: string } | null = null
  if (data.managerOverride) {
    const { type, value, reason, managerEmail, managerPassword } = data.managerOverride
    if (!reason.trim()) throw new Error("A reason is required for a manager override.")
    if (!Number.isFinite(value) || value <= 0) throw new Error("Invalid override value.")

    const manager = await prisma.user.findUnique({ where: { email: managerEmail } })
    const passwordOk = manager ? await bcrypt.compare(managerPassword, manager.password) : false
    if (!manager || !passwordOk || !["MANAGER", "SUPER_ADMIN"].includes(manager.role)) {
      throw new Error("Invalid manager credentials — override not applied.")
    }

    manualDiscount = { type, value, reason: reason.trim(), byUserId: manager.id }
  }

  const result = await prisma.$transaction(async (tx) => {
    const serialNumbers = data.items.map((i) => i.serialNumber)

    // Read all items inside the transaction so we hold a consistent snapshot
    const inventoryItems = await tx.inventoryItem.findMany({
      where: { serialNumber: { in: serialNumbers } },
    })

    if (inventoryItems.length !== serialNumbers.length) {
      const found = inventoryItems.map((i) => i.serialNumber)
      const missing = serialNumbers.filter((sn) => !found.includes(sn))
      throw new Error(`Items not found in inventory: ${missing.join(", ")}`)
    }

    // Validate all are AVAILABLE (pre-flight check before writing anything)
    for (const item of inventoryItems) {
      if (item.status !== "AVAILABLE") {
        throw new Error(
          `"${item.modelName}" (${item.serialNumber}) is already ${item.status}. Remove it from the cart and try again.`
        )
      }
    }

    // Server-side total calculation — never trust the client-supplied total
    const subtotal = inventoryItems.reduce(
      (sum, i) => sum + Number(i.retailPrice),
      0
    )
    let discountMeta: { type: string; value: number } | null = null
    if (data.appliedDiscountId) {
      const campaign = await tx.discountCampaign.findUnique({
        where: { id: data.appliedDiscountId },
      })
      if (campaign?.isActive) {
        discountMeta = { type: campaign.type, value: Number(campaign.value) }
      }
    } else if (manualDiscount) {
      discountMeta = { type: manualDiscount.type, value: manualDiscount.value }
    }
    const { total } = calculateOrderTotals(subtotal, discountMeta)

    // Create the Order record
    const order = await tx.order.create({
      data: {
        cashierId,
        totalAmount: total,
        appliedDiscountId: data.appliedDiscountId ?? null,
        manualDiscountType: manualDiscount?.type ?? null,
        manualDiscountValue: manualDiscount?.value ?? null,
        manualDiscountReason: manualDiscount?.reason ?? null,
        manualDiscountById: manualDiscount?.byUserId ?? null,
      },
    })

    if (manualDiscount) {
      await tx.auditLog.create({
        data: {
          userId: manualDiscount.byUserId,
          action: "MANAGER_OVERRIDE_APPLIED",
          details: {
            orderId: order.id,
            cashierId,
            overrideType: manualDiscount.type,
            overrideValue: manualDiscount.value,
            reason: manualDiscount.reason,
          }
        }
      })
    }

    // For each item: create OrderItem, then atomically flip status to SOLD.
    // The updateMany WHERE status='AVAILABLE' is the concurrency guard:
    // if another cashier already sold this item between our findMany and here,
    // that UPDATE will match 0 rows → we throw and roll back the entire transaction.
    for (const inputItem of data.items) {
      const invItem = inventoryItems.find(
        (i) => i.serialNumber === inputItem.serialNumber
      )!

      const orderItem = await tx.orderItem.create({
        data: {
          orderId: order.id,
          priceAtSale: Number(invItem.retailPrice),
        },
      })

      const updated = await tx.inventoryItem.updateMany({
        where: { serialNumber: invItem.serialNumber, status: "AVAILABLE" },
        data: {
          status: "SOLD",
          orderItemId: orderItem.id,
          // Persist any spec corrections the cashier made at checkout
          ...(inputItem.confirmedRam
            ? { ram: inputItem.confirmedRam }
            : {}),
          ...(inputItem.confirmedStorage
            ? { storage: inputItem.confirmedStorage }
            : {}),
        },
      })

      if (updated.count === 0) {
        // Another transaction beat us to this item
        throw new Error(
          `Concurrency conflict: "${invItem.modelName}" (${invItem.serialNumber}) was just sold by another cashier. Please remove it from the cart.`
        )
      }
    }

    return { orderId: order.id, total }
  })

  revalidatePath("/inventory")
  revalidatePath("/dashboard")
  revalidatePath("/accounting")

  return result
}
