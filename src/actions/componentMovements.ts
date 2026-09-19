"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export type ComponentMovementRow = {
  orderId: string
  orderDate: string
  cashierName: string
  serialNumber: string
  modelName: string
  component: "RAM" | "STORAGE"
  from: string
  to: string
  status: "ACCOUNTED" | "UNACCOUNTED"
}

export type ComponentMovementsReport = {
  rows: ComponentMovementRow[]
  summary: {
    totalLaptopsSold: number
    totalSwaps: number
    accountedCount: number
    unaccountedCount: number
  }
  byStaff: { name: string; count: number }[]
}

// "Accounted" means the removed original component was priced and routed to
// spare-parts stock (see src/actions/order.ts); "unaccounted" means the swap
// happened but there was no price-list entry for the removed spec, so it
// couldn't be — that's flagged via a COMPONENT_SWAP_UNPRICED audit log entry
// at the moment of sale, which this report reads back.
export async function getComponentMovements(
  fromISO: string,
  toISO: string
): Promise<ComponentMovementsReport> {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const from = new Date(fromISO)
  const to = new Date(toISO)

  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: { createdAt: { gte: from, lte: to } },
      originalRam: { not: null },
    },
    include: {
      order: { select: { id: true, createdAt: true, cashier: { select: { name: true } } } },
      inventoryItem: { select: { serialNumber: true, modelName: true, ram: true, storage: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const unpricedLogs = await prisma.auditLog.findMany({
    where: { action: "COMPONENT_SWAP_UNPRICED", createdAt: { gte: from, lte: to } },
    select: { details: true },
  })
  const unaccountedKeys = new Set(
    unpricedLogs.map((l) => {
      const d = l.details as { orderId: string; type: string }
      return `${d.orderId}::${d.type}`
    })
  )

  const rows: ComponentMovementRow[] = []
  for (const item of orderItems) {
    if (!item.inventoryItem) continue
    const { order, inventoryItem: inv } = item

    if (item.originalRam !== null && item.originalRam !== inv.ram) {
      rows.push({
        orderId: order.id,
        orderDate: order.createdAt.toISOString(),
        cashierName: order.cashier.name,
        serialNumber: inv.serialNumber,
        modelName: inv.modelName,
        component: "RAM",
        from: item.originalRam,
        to: inv.ram,
        status: unaccountedKeys.has(`${order.id}::RAM`) ? "UNACCOUNTED" : "ACCOUNTED",
      })
    }
    if (item.originalStorage !== null && item.originalStorage !== inv.storage) {
      rows.push({
        orderId: order.id,
        orderDate: order.createdAt.toISOString(),
        cashierName: order.cashier.name,
        serialNumber: inv.serialNumber,
        modelName: inv.modelName,
        component: "STORAGE",
        from: item.originalStorage,
        to: inv.storage,
        status: unaccountedKeys.has(`${order.id}::STORAGE`) ? "UNACCOUNTED" : "ACCOUNTED",
      })
    }
  }

  const byStaffMap = new Map<string, number>()
  for (const r of rows) byStaffMap.set(r.cashierName, (byStaffMap.get(r.cashierName) ?? 0) + 1)

  return {
    rows,
    summary: {
      totalLaptopsSold: orderItems.length,
      totalSwaps: rows.length,
      accountedCount: rows.filter((r) => r.status === "ACCOUNTED").length,
      unaccountedCount: rows.filter((r) => r.status === "UNACCOUNTED").length,
    },
    byStaff: Array.from(byStaffMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  }
}
