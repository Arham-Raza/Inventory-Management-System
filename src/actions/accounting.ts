"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function getAccountingStats() {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const orders = await prisma.order.findMany({
    include: {
      items: {
        include: {
          inventoryItem: true,
          accessory: true,
        },
      },
      discount: true,
      manualDiscountBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  let totalRevenue = 0
  let totalCogs = 0

  type OrderWithItems = typeof orders[number]
  type OrderItem = OrderWithItems["items"][number]

  const transactions = orders.map((order: OrderWithItems) => {
    const revenue = Number(order.totalAmount)
    const cogs = order.items.reduce((sum: number, item: OrderItem) => {
      if (item.accessory) {
        return sum + Number(item.accessory.costPrice ?? 0) * item.quantity
      }
      return sum + Number(item.inventoryItem?.purchaseCost ?? 0)
    }, 0)
    const profit = revenue - cogs

    totalRevenue += revenue
    totalCogs += cogs

    return {
      id: order.id,
      date: order.createdAt,
      // Sum of units, not rows — an accessory row can represent several units.
      itemsCount: order.items.reduce((sum: number, i: OrderItem) => sum + i.quantity, 0),
      // Serial + lot numbers of every unit in this order, so accounting can
      // reconcile this ledger row against the matching entry/entries in the
      // external accounting software.
      serialNumbers: order.items
        .map((i: OrderItem) => i.inventoryItem?.serialNumber)
        .filter((s: string | undefined): s is string => Boolean(s)),
      lotNumbers: Array.from(
        new Set(
          order.items
            .map((i: OrderItem) => i.inventoryItem?.lotNumber)
            .filter((l: string | null | undefined): l is string => Boolean(l))
        )
      ),
      revenue,
      cogs,
      profit,
      discountName: order.discount?.name ?? null,
      // Manager-authorized one-off discount (no pre-created campaign) — surfaced
      // separately so an ad-hoc discount always stays explainable in the ledger.
      manualDiscount: order.manualDiscountReason
        ? {
            type: order.manualDiscountType!,
            value: Number(order.manualDiscountValue),
            reason: order.manualDiscountReason,
            authorizedBy: order.manualDiscountBy?.name ?? "Unknown",
          }
        : null,
    }
  })

  const grossProfit = totalRevenue - totalCogs
  const profitMarginPercent =
    totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

  return {
    totalRevenue,
    totalCogs,
    grossProfit,
    profitMarginPercent,
    transactions,
  }
}
