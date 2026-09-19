"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { calculateOrderTotals } from "@/lib/money"
import { CreateOrderSchema } from "@/lib/validations"
import { calculatePointsEarned, pointsToValue } from "@/lib/loyalty"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { splitComponentPrice, type ComponentPriceLookup } from "@/lib/componentSplit"

type LaptopOrderItemInput = {
  type: "LAPTOP"
  serialNumber: string
  // Confirmed specs at checkout time — may differ from DB if unit was reconfigured
  confirmedRam?: string
  confirmedStorage?: string
}

type AccessoryOrderItemInput = {
  type: "ACCESSORY"
  accessoryId: string
  quantity: number
}

type OrderItemInput = LaptopOrderItemInput | AccessoryOrderItemInput

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
  customerId?: string
  redeemPoints?: number
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

  const laptopInputs = data.items.filter(
    (i): i is LaptopOrderItemInput => i.type === "LAPTOP"
  )
  const accessoryInputs = data.items.filter(
    (i): i is AccessoryOrderItemInput => i.type === "ACCESSORY"
  )

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
    const serialNumbers = laptopInputs.map((i) => i.serialNumber)
    const accessoryIds = accessoryInputs.map((i) => i.accessoryId)

    // Read all items inside the transaction so we hold a consistent snapshot
    const [inventoryItems, accessories, customer] = await Promise.all([
      tx.inventoryItem.findMany({ where: { serialNumber: { in: serialNumbers } } }),
      tx.accessory.findMany({ where: { id: { in: accessoryIds } } }),
      data.customerId
        ? tx.customer.findUnique({ where: { id: data.customerId } })
        : Promise.resolve(null),
    ])

    if (data.customerId && !customer) {
      throw new Error("Selected customer no longer exists.")
    }
    const redeemPoints = data.redeemPoints ?? 0
    if (redeemPoints > 0) {
      if (!customer) throw new Error("Points can only be redeemed against a registered customer.")
      if (redeemPoints > customer.points) {
        throw new Error(`"${customer.name}" only has ${customer.points} points available.`)
      }
    }

    if (inventoryItems.length !== serialNumbers.length) {
      const found = inventoryItems.map((i) => i.serialNumber)
      const missing = serialNumbers.filter((sn) => !found.includes(sn))
      throw new Error(`Items not found in inventory: ${missing.join(", ")}`)
    }
    if (accessories.length !== new Set(accessoryIds).size) {
      throw new Error("One or more accessories in the cart no longer exist.")
    }

    // Validate all are AVAILABLE / in stock (pre-flight check before writing anything)
    for (const item of inventoryItems) {
      if (item.status !== "AVAILABLE") {
        throw new Error(
          `"${item.modelName}" (${item.serialNumber}) is already ${item.status}. Remove it from the cart and try again.`
        )
      }
    }
    for (const input of accessoryInputs) {
      const acc = accessories.find((a) => a.id === input.accessoryId)!
      if (acc.quantity < input.quantity) {
        throw new Error(
          `"${acc.name}" — only ${acc.quantity} left in stock, ${input.quantity} requested. Adjust the quantity and try again.`
        )
      }
    }

    // Server-side total calculation — never trust the client-supplied total
    const laptopSubtotal = inventoryItems.reduce((sum, i) => sum + Number(i.retailPrice), 0)
    const accessorySubtotal = accessoryInputs.reduce((sum, input) => {
      const acc = accessories.find((a) => a.id === input.accessoryId)!
      return sum + Number(acc.sellingPrice) * input.quantity
    }, 0)
    const subtotal = laptopSubtotal + accessorySubtotal

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
    const redemptionValue = redeemPoints > 0 ? pointsToValue(redeemPoints) : 0
    const { total } = calculateOrderTotals(subtotal, discountMeta, redemptionValue)
    const pointsEarned = customer ? calculatePointsEarned(total) : null

    // Create the Order record
    const order = await tx.order.create({
      data: {
        cashierId,
        customerId: customer?.id ?? null,
        totalAmount: total,
        appliedDiscountId: data.appliedDiscountId ?? null,
        manualDiscountType: manualDiscount?.type ?? null,
        manualDiscountValue: manualDiscount?.value ?? null,
        manualDiscountReason: manualDiscount?.reason ?? null,
        manualDiscountById: manualDiscount?.byUserId ?? null,
        pointsEarned,
        pointsRedeemed: customer ? redeemPoints : null,
      },
    })

    // Net points change in one atomic, guarded update — the WHERE clause
    // re-checks the balance so a concurrent redemption on the same customer
    // can't take it negative.
    if (customer) {
      const updated = await tx.customer.updateMany({
        where: { id: customer.id, points: { gte: redeemPoints } },
        data: { points: { increment: (pointsEarned ?? 0) - redeemPoints } },
      })
      if (updated.count === 0) {
        throw new Error(`"${customer.name}"'s points balance changed before checkout completed. Please re-check.`)
      }
    }

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

    // Component price list, loaded once — used to split a laptop's sale
    // price across laptop/RAM/storage lines when the confirmed spec at
    // checkout differs from what it was stocked in with (see componentSplit.ts).
    const componentPrices = laptopInputs.length
      ? await tx.componentPrice.findMany()
      : []
    const priceMap = new Map(
      componentPrices.map((p) => [`${p.type}::${p.label}`, Number(p.price)])
    )
    const priceOf: ComponentPriceLookup = (type, label) =>
      priceMap.get(`${type}::${label}`) ?? null

    // For each laptop: create OrderItem, then atomically flip status to SOLD.
    // The updateMany WHERE status='AVAILABLE' is the concurrency guard:
    // if another cashier already sold this item between our findMany and here,
    // that UPDATE will match 0 rows → we throw and roll back the entire transaction.
    for (const inputItem of laptopInputs) {
      const invItem = inventoryItems.find(
        (i) => i.serialNumber === inputItem.serialNumber
      )!

      const confirmedRam = inputItem.confirmedRam ?? invItem.ram
      const confirmedStorage = inputItem.confirmedStorage ?? invItem.storage
      const split = splitComponentPrice(
        Number(invItem.retailPrice),
        invItem.ram,
        invItem.storage,
        confirmedRam,
        confirmedStorage,
        priceOf
      )
      const wasSplit = split.ramPrice !== null || split.storagePrice !== null

      const orderItem = await tx.orderItem.create({
        data: {
          orderId: order.id,
          priceAtSale: Number(invItem.retailPrice),
          originalRam: invItem.ram,
          originalStorage: invItem.storage,
          ...(wasSplit
            ? {
                laptopPriceAtSale: split.laptopPrice,
                ramPriceAtSale: split.ramPrice,
                storagePriceAtSale: split.storagePrice,
              }
            : {}),
        },
      })

      // The component that came out goes to spare-parts stock — reuses the
      // existing Accessory model, keyed by a deterministic "SPARE-..." barcode
      // so repeated swaps of the same spec just increment quantity. Valued at
      // the ORIGINAL label's own price-list entry — independent of whether
      // the confirmed (installed) spec had one, so this can succeed or fail
      // separately from the revenue split above.
      for (const [type, changed, originalLabel] of [
        ["RAM", split.ramChanged, invItem.ram] as const,
        ["STORAGE", split.storageChanged, invItem.storage] as const,
      ]) {
        if (!changed) continue
        const originalPrice = priceOf(type, originalLabel)
        if (originalPrice === null) {
          await tx.auditLog.create({
            data: {
              userId: cashierId,
              action: "COMPONENT_SWAP_UNPRICED",
              details: {
                orderId: order.id, serialNumber: invItem.serialNumber,
                type, removedLabel: originalLabel,
                reason: "No price-list entry for the removed component — not routed to spare-parts stock.",
              },
            },
          })
          continue
        }
        const barcode = `SPARE-${type}-${originalLabel.trim().toUpperCase().replace(/\s+/g, "-")}`
        const existing = await tx.accessory.findUnique({ where: { barcode } })
        if (existing) {
          await tx.accessory.update({ where: { barcode }, data: { quantity: { increment: 1 } } })
        } else {
          await tx.accessory.create({
            data: {
              barcode,
              name: `${type === "RAM" ? "RAM" : "Storage"} — ${originalLabel} (reclaimed)`,
              sellingPrice: originalPrice,
              quantity: 1,
            },
          })
        }
      }

      const updated = await tx.inventoryItem.updateMany({
        where: { serialNumber: invItem.serialNumber, status: "AVAILABLE" },
        data: {
          status: "SOLD",
          orderItemId: orderItem.id,
          // Persist any spec corrections the cashier made at checkout
          ram: confirmedRam,
          storage: confirmedStorage,
        },
      })

      if (updated.count === 0) {
        // Another transaction beat us to this item
        throw new Error(
          `Concurrency conflict: "${invItem.modelName}" (${invItem.serialNumber}) was just sold by another cashier. Please remove it from the cart.`
        )
      }
    }

    // For each accessory: same atomic-guard pattern, but decrementing a
    // running quantity instead of flipping a single unit's status — the
    // WHERE quantity >= requested is what makes this safe under concurrency.
    for (const input of accessoryInputs) {
      const acc = accessories.find((a) => a.id === input.accessoryId)!

      await tx.orderItem.create({
        data: {
          orderId: order.id,
          accessoryId: acc.id,
          quantity: input.quantity,
          priceAtSale: Number(acc.sellingPrice),
        },
      })

      const updated = await tx.accessory.updateMany({
        where: { id: acc.id, quantity: { gte: input.quantity } },
        data: { quantity: { decrement: input.quantity } },
      })

      if (updated.count === 0) {
        throw new Error(
          `Concurrency conflict: "${acc.name}" stock changed before checkout completed. Please re-check the quantity.`
        )
      }
    }

    return {
      orderId: order.id,
      total,
      pointsEarned,
      customer: customer
        ? { id: customer.id, phone: customer.phone, whatsappOptIn: customer.whatsappOptIn, newBalance: customer.points + (pointsEarned ?? 0) - redeemPoints }
        : null,
    }
  })

  revalidatePath("/inventory")
  revalidatePath("/accessories")
  revalidatePath("/dashboard")
  revalidatePath("/accounting")

  if (result.customer?.whatsappOptIn) {
    await sendWhatsAppMessage(
      result.customer.phone,
      `Thanks for your purchase! You earned ${result.pointsEarned ?? 0} points. Your new balance is ${result.customer.newBalance} points.`
    )
  }

  return { orderId: result.orderId, total: result.total, pointsEarned: result.pointsEarned, newPointsBalance: result.customer?.newBalance ?? null }
}
