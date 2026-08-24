"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function getDashboardStats() {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [
    availableStock,
    totalItems,
    revenueAgg,
    todayAgg,
    recentOrders,
  ] = await Promise.all([
    prisma.inventoryItem.count({ where: { status: "AVAILABLE" } }),
    prisma.inventoryItem.count(),
    // Lifetime totals
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      _count: true,
    }),
    // Today's totals
    prisma.order.aggregate({
      where: { createdAt: { gte: todayStart } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    // Last 5 transactions for the activity feed
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        cashier: { select: { name: true } },
        items: { select: { id: true } },
        discount: { select: { name: true } },
      },
    }),
  ])

  return {
    availableStock,
    totalItems,
    lifetimeRevenue: Number(revenueAgg._sum.totalAmount ?? 0),
    lifetimeOrders: revenueAgg._count,
    todayRevenue: Number(todayAgg._sum.totalAmount ?? 0),
    todayOrders: todayAgg._count,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      cashierName: o.cashier.name,
      itemCount: o.items.length,
      total: Number(o.totalAmount),
      discountName: o.discount?.name ?? null,
      createdAt: o.createdAt,
    })),
  }
}
