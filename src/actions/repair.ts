"use server"

import { randomUUID } from "node:crypto"
import ExcelJS from "exceljs"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import {
  CreateTechnicianSchema,
  DispatchToRepairSchema,
  ReturnFromRepairSchema,
} from "@/lib/validations"

function assertCanManage(role: string | undefined) {
  if (!role || role === "CASHIER" || role === "DATA_ENTRY") {
    throw new Error("Unauthorized")
  }
}

export async function listTechnicians() {
  const session = await auth()
  assertCanManage(session?.user?.role)

  const technicians = await prisma.technician.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  })
  return technicians
}

export async function createTechnician(inputData: {
  name: string
  phone?: string
  specialty?: string
}) {
  const session = await auth()
  assertCanManage(session?.user?.role)

  const data = CreateTechnicianSchema.parse(inputData)
  const technician = await prisma.technician.create({
    data: {
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      specialty: data.specialty?.trim() || null,
    },
  })

  revalidatePath("/repair")
  return technician
}

export async function dispatchToRepair(inputData: {
  technicianId: string
  items: { serialNumber: string; remarks?: string; expectedReturnDate?: string }[]
}) {
  const session = await auth()
  assertCanManage(session?.user?.role)
  const userId = session!.user!.id!

  const data = DispatchToRepairSchema.parse(inputData)
  const batchId = randomUUID()

  await prisma.$transaction(async (tx) => {
    const technician = await tx.technician.findUnique({ where: { id: data.technicianId } })
    if (!technician) throw new Error("Selected technician no longer exists.")

    const serialNumbers = data.items.map((i) => i.serialNumber)
    const inventoryItems = await tx.inventoryItem.findMany({
      where: { serialNumber: { in: serialNumbers } },
    })
    if (inventoryItems.length !== new Set(serialNumbers).size) {
      const found = inventoryItems.map((i) => i.serialNumber)
      const missing = serialNumbers.filter((sn) => !found.includes(sn))
      throw new Error(`Items not found in inventory: ${missing.join(", ")}`)
    }
    for (const item of inventoryItems) {
      if (item.status !== "AVAILABLE") {
        throw new Error(
          `"${item.modelName}" (${item.serialNumber}) is ${item.status}, not AVAILABLE — remove it and try again.`
        )
      }
    }

    for (const input of data.items) {
      await tx.repairDispatch.create({
        data: {
          batchId,
          serialNumber: input.serialNumber,
          technicianId: data.technicianId,
          remarks: input.remarks?.trim() || null,
          expectedReturnDate: input.expectedReturnDate
            ? new Date(input.expectedReturnDate)
            : null,
          dispatchedById: userId,
        },
      })

      const updated = await tx.inventoryItem.updateMany({
        where: { serialNumber: input.serialNumber, status: "AVAILABLE" },
        data: { status: "OUT_FOR_REPAIR" },
      })
      if (updated.count === 0) {
        throw new Error(
          `Concurrency conflict: "${input.serialNumber}" changed status before dispatch completed.`
        )
      }
    }
  })

  revalidatePath("/repair")
  revalidatePath("/inventory")
  return { batchId }
}

export async function returnFromRepair(inputData: { dispatchId: string; cost: number }) {
  const session = await auth()
  assertCanManage(session?.user?.role)
  const userId = session!.user!.id!

  const data = ReturnFromRepairSchema.parse(inputData)

  await prisma.$transaction(async (tx) => {
    const dispatch = await tx.repairDispatch.findUnique({ where: { id: data.dispatchId } })
    if (!dispatch || dispatch.status !== "OUT_FOR_REPAIR") {
      throw new Error("This item is not currently marked as out for repair.")
    }

    await tx.repairDispatch.update({
      where: { id: dispatch.id },
      data: {
        status: "RETURNED",
        cost: data.cost,
        returnedAt: new Date(),
        returnedById: userId,
      },
    })

    const updated = await tx.inventoryItem.updateMany({
      where: { serialNumber: dispatch.serialNumber, status: "OUT_FOR_REPAIR" },
      data: { status: "AVAILABLE" },
    })
    if (updated.count === 0) {
      throw new Error(`Concurrency conflict: "${dispatch.serialNumber}" is no longer marked out for repair.`)
    }
  })

  revalidatePath("/repair")
  revalidatePath("/inventory")
}

export async function listActiveDispatches() {
  const session = await auth()
  assertCanManage(session?.user?.role)

  const dispatches = await prisma.repairDispatch.findMany({
    where: { status: "OUT_FOR_REPAIR" },
    include: {
      inventoryItem: { select: { modelName: true, serialNumber: true } },
      technician: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  return dispatches.map((d) => ({
    id: d.id,
    serialNumber: d.serialNumber,
    modelName: d.inventoryItem.modelName,
    technicianId: d.technician.id,
    technicianName: d.technician.name,
    remarks: d.remarks,
    expectedReturnDate: d.expectedReturnDate?.toISOString() ?? null,
    dispatchedAt: d.createdAt.toISOString(),
  }))
}

export async function getTechnicianLedger() {
  const session = await auth()
  assertCanManage(session?.user?.role)

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [technicians, allDispatches] = await Promise.all([
    prisma.technician.findMany({ where: { active: true } }),
    prisma.repairDispatch.findMany({
      where: { status: "RETURNED", cost: { not: null } },
      select: { technicianId: true, cost: true, returnedAt: true },
    }),
  ])

  return technicians.map((t) => {
    const jobs = allDispatches.filter((d) => d.technicianId === t.id)
    const allTimeCost = jobs.reduce((sum, j) => sum + Number(j.cost), 0)
    const monthToDateCost = jobs
      .filter((j) => j.returnedAt && j.returnedAt >= monthStart)
      .reduce((sum, j) => sum + Number(j.cost), 0)
    return {
      id: t.id,
      name: t.name,
      jobsCompleted: jobs.length,
      allTimeCost,
      monthToDateCost,
    }
  })
}

export async function getDeliveryOrderExcel(batchId: string) {
  const session = await auth()
  assertCanManage(session?.user?.role)

  const dispatches = await prisma.repairDispatch.findMany({
    where: { batchId },
    include: {
      inventoryItem: true,
      technician: { select: { name: true } },
    },
  })
  if (dispatches.length === 0) throw new Error("No dispatch found for this batch.")

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Delivery Order")

  sheet.addRow([`Delivery Order — Technician: ${dispatches[0].technician.name}`])
  sheet.addRow([`Date: ${dispatches[0].createdAt.toLocaleString("en-MY")}`])
  sheet.addRow([])

  const columns = ["Model", "Serial Number", "CPU", "GPU", "RAM", "Storage", "Remarks"]
  const headerRow = sheet.addRow(columns)
  headerRow.font = { bold: true }

  for (const d of dispatches) {
    sheet.addRow([
      d.inventoryItem.modelName,
      d.inventoryItem.serialNumber,
      d.inventoryItem.processor,
      d.inventoryItem.gpu,
      d.inventoryItem.ram,
      d.inventoryItem.storage,
      d.remarks ?? "",
    ])
  }

  sheet.columns.forEach((col) => {
    col.width = 22
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return {
    base64: Buffer.from(buffer).toString("base64"),
    filename: `delivery-order-${dispatches[0].technician.name.replace(/\s+/g, "-")}-${batchId.slice(0, 8)}.xlsx`,
  }
}
