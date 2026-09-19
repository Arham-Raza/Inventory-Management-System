"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { CreateWalkInJobSchema, CompleteWalkInJobSchema } from "@/lib/validations"

function assertCanManage(role: string | undefined) {
  if (!role || role === "CASHIER" || role === "DATA_ENTRY") {
    throw new Error("Unauthorized")
  }
}

const BARCODE_PREFIX = "WALKIN-"
const BARCODE_DIGITS = 6

export async function createWalkInJob(inputData: {
  jobType: "REPAIR" | "UPGRADE" | "SERVICE"
  customerName: string
  customerPhone?: string
  deviceDescription: string
  issueDescription: string
  estimatedCost: number
  technicianId?: string
}) {
  const session = await auth()
  assertCanManage(session?.user?.role)
  const userId = session!.user!.id!

  const data = CreateWalkInJobSchema.parse(inputData)

  const job = await prisma.$transaction(async (tx) => {
    const existing = await tx.walkInRepairJob.findMany({
      where: { barcode: { startsWith: BARCODE_PREFIX } },
      select: { barcode: true },
    })
    let maxN = 0
    for (const { barcode } of existing) {
      const suffix = barcode.slice(BARCODE_PREFIX.length)
      if (/^\d+$/.test(suffix)) maxN = Math.max(maxN, parseInt(suffix, 10))
    }
    const barcode = `${BARCODE_PREFIX}${String(maxN + 1).padStart(BARCODE_DIGITS, "0")}`

    return tx.walkInRepairJob.create({
      data: {
        barcode,
        jobType: data.jobType,
        customerName: data.customerName.trim(),
        customerPhone: data.customerPhone?.trim() || null,
        deviceDescription: data.deviceDescription.trim(),
        issueDescription: data.issueDescription.trim(),
        estimatedCost: data.estimatedCost,
        technicianId: data.technicianId || null,
        intakeById: userId,
      },
      include: { technician: { select: { name: true } } },
    })
  })

  revalidatePath("/walkin-repairs")

  return {
    id: job.id,
    barcode: job.barcode,
    jobType: job.jobType,
    customerName: job.customerName,
    deviceDescription: job.deviceDescription,
    estimatedCost: Number(job.estimatedCost),
    technicianName: job.technician?.name ?? null,
    createdAt: job.createdAt.toISOString(),
  }
}

export async function listActiveWalkInJobs() {
  const session = await auth()
  assertCanManage(session?.user?.role)

  const jobs = await prisma.walkInRepairJob.findMany({
    where: { status: "IN_PROGRESS" },
    include: { technician: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  })

  return jobs.map((j) => ({
    id: j.id,
    barcode: j.barcode,
    jobType: j.jobType,
    customerName: j.customerName,
    customerPhone: j.customerPhone,
    deviceDescription: j.deviceDescription,
    issueDescription: j.issueDescription,
    estimatedCost: Number(j.estimatedCost),
    technicianName: j.technician?.name ?? null,
    createdAt: j.createdAt.toISOString(),
  }))
}

export async function completeWalkInJob(inputData: { jobId: string; actualCost: number; shopCost: number }) {
  const session = await auth()
  assertCanManage(session?.user?.role)
  const userId = session!.user!.id!

  const data = CompleteWalkInJobSchema.parse(inputData)

  await prisma.$transaction(async (tx) => {
    const job = await tx.walkInRepairJob.findUnique({ where: { id: data.jobId } })
    if (!job || job.status !== "IN_PROGRESS") {
      throw new Error("This job is not currently in progress.")
    }

    await tx.walkInRepairJob.update({
      where: { id: data.jobId },
      data: {
        status: "COMPLETED",
        actualCost: data.actualCost,
        shopCost: data.shopCost,
        completedAt: new Date(),
        completedById: userId,
      },
    })
  })

  revalidatePath("/walkin-repairs")
}

export async function getWalkInStats(fromISO: string, toISO: string) {
  const session = await auth()
  assertCanManage(session?.user?.role)

  const from = new Date(fromISO)
  const to = new Date(toISO)

  const completed = await prisma.walkInRepairJob.findMany({
    where: { status: "COMPLETED", completedAt: { gte: from, lte: to } },
  })
  const inProgressCount = await prisma.walkInRepairJob.count({
    where: { status: "IN_PROGRESS", createdAt: { gte: from, lte: to } },
  })

  const totalCharged = completed.reduce((sum, j) => sum + Number(j.actualCost ?? 0), 0)
  const totalShopCost = completed.reduce((sum, j) => sum + Number(j.shopCost ?? 0), 0)

  return {
    jobsCompleted: completed.length,
    jobsInProgress: inProgressCount,
    totalCharged,
    totalShopCost,
    totalProfit: totalCharged - totalShopCost,
  }
}
