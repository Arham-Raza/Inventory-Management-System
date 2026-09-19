"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

function assertCanManage(role: string | undefined) {
  if (!role || role === "CASHIER" || role === "DATA_ENTRY") {
    throw new Error("Unauthorized")
  }
}

export async function listStockTakeSessions() {
  const session = await auth()
  assertCanManage(session?.user?.role)

  const sessions = await prisma.stockTakeSession.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      startedBy: { select: { name: true } },
      _count: { select: { scans: true } },
    },
  })

  return sessions.map((s) => ({
    id: s.id,
    status: s.status,
    startedByName: s.startedBy.name,
    createdAt: s.createdAt.toISOString(),
    closedAt: s.closedAt?.toISOString() ?? null,
    scanCount: s._count.scans,
  }))
}

export async function startStockTakeSession() {
  const session = await auth()
  assertCanManage(session?.user?.role)
  const userId = session!.user!.id!

  const created = await prisma.stockTakeSession.create({
    data: { startedById: userId },
  })

  revalidatePath("/stock-take")
  return { id: created.id }
}

export async function recordStockTakeScan(inputData: { sessionId: string; serialNumber: string }) {
  const session = await auth()
  assertCanManage(session?.user?.role)
  const userId = session!.user!.id!

  const serialNumber = inputData.serialNumber.trim()
  if (!serialNumber) throw new Error("Empty scan.")

  const stSession = await prisma.stockTakeSession.findUnique({ where: { id: inputData.sessionId } })
  if (!stSession || stSession.status !== "OPEN") {
    throw new Error("This session is not open.")
  }

  const existingScan = await prisma.stockTakeScan.findUnique({
    where: { sessionId_serialNumber: { sessionId: inputData.sessionId, serialNumber } },
  })
  if (existingScan) {
    return { outcome: "ALREADY_COUNTED" as const, serialNumber }
  }

  const item = await prisma.inventoryItem.findUnique({ where: { serialNumber } })

  await prisma.stockTakeScan.create({
    data: {
      sessionId: inputData.sessionId,
      serialNumber,
      recognized: !!item,
      scannedById: userId,
    },
  })

  revalidatePath("/stock-take")

  if (!item) {
    return { outcome: "UNRECOGNIZED" as const, serialNumber }
  }
  if (item.status !== "AVAILABLE") {
    return {
      outcome: "STATUS_MISMATCH" as const,
      serialNumber,
      modelName: item.modelName,
      status: item.status,
    }
  }
  return { outcome: "MATCHED" as const, serialNumber, modelName: item.modelName }
}

export async function closeStockTakeSession(sessionId: string) {
  const session = await auth()
  assertCanManage(session?.user?.role)
  const userId = session!.user!.id!

  const updated = await prisma.stockTakeSession.updateMany({
    where: { id: sessionId, status: "OPEN" },
    data: { status: "CLOSED", closedAt: new Date(), closedById: userId },
  })
  if (updated.count === 0) throw new Error("Session is already closed.")

  revalidatePath("/stock-take")
}

export async function getStockTakeReport(sessionId: string) {
  const session = await auth()
  assertCanManage(session?.user?.role)

  const [scans, expectedItems] = await Promise.all([
    prisma.stockTakeScan.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.inventoryItem.findMany({
      where: { status: "AVAILABLE" },
      select: { serialNumber: true, modelName: true },
    }),
  ])

  const scannedSerials = new Set(scans.map((s) => s.serialNumber))
  const expectedBySerial = new Map(expectedItems.map((i) => [i.serialNumber, i.modelName]))

  const found = scans
    .filter((s) => expectedBySerial.has(s.serialNumber))
    .map((s) => ({ serialNumber: s.serialNumber, modelName: expectedBySerial.get(s.serialNumber)! }))

  const missing = expectedItems
    .filter((i) => !scannedSerials.has(i.serialNumber))
    .map((i) => ({ serialNumber: i.serialNumber, modelName: i.modelName }))

  const unrecognized = scans
    .filter((s) => !expectedBySerial.has(s.serialNumber))
    .map((s) => ({ serialNumber: s.serialNumber, recognized: s.recognized }))

  return {
    totalExpected: expectedItems.length,
    totalScanned: scans.length,
    found,
    missing,
    unrecognized,
  }
}
