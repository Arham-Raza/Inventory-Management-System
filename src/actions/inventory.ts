"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import ExcelJS from "exceljs"
import {
  IMPORT_COLUMNS,
  MAX_IMPORT_ROWS,
  matchColumns,
  validateRow,
  type InventoryImportRow,
  type InvalidImportRow,
} from "@/lib/inventory-import"

export async function addInventoryItem(data: {
  serialNumber: string
  lotNumber?: string
  modelName: string
  processor: string
  gpu: string
  ram: string
  storage: string
  purchaseCost: number
  retailPrice: number
}) {
  const session = await auth()
  if (!session || session.user?.role === "CASHIER") {
    throw new Error("Unauthorized")
  }

  const item = await prisma.inventoryItem.create({
    data: {
      ...data,
      lotNumber: data.lotNumber?.trim() || null,
      status: "PENDING_APPROVAL",
      createdById: session.user.id,
    },
  })

  revalidatePath("/inventory")
  revalidatePath("/data-entry")
  // Prisma Decimal fields aren't plain objects — can't cross the
  // Server Action → Client Component boundary, so only return plain values.
  return { serialNumber: item.serialNumber, lotNumber: item.lotNumber }
}

// Any newly-added unit — regardless of who added it — sits in
// PENDING_APPROVAL until a SUPER_ADMIN clears it here. Only after approval
// does it become AVAILABLE and sellable at the POS terminal.
export async function approveInventoryItem(serialNumber: string) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") throw new Error("Unauthorized")

  const result = await prisma.inventoryItem.updateMany({
    where: { serialNumber, status: "PENDING_APPROVAL" },
    data: {
      status: "AVAILABLE",
      approvedById: session.user.id,
      approvedAt: new Date(),
    },
  })

  if (result.count === 0) {
    throw new Error("Item is no longer pending approval — it may have already been processed.")
  }

  revalidatePath("/inventory")
  revalidatePath("/data-entry")
}

export async function rejectInventoryItem(serialNumber: string) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") throw new Error("Unauthorized")

  const result = await prisma.inventoryItem.updateMany({
    where: { serialNumber, status: "PENDING_APPROVAL" },
    data: {
      status: "REJECTED",
      approvedById: session.user.id,
      approvedAt: new Date(),
    },
  })

  if (result.count === 0) {
    throw new Error("Item is no longer pending approval — it may have already been processed.")
  }

  revalidatePath("/inventory")
  revalidatePath("/data-entry")
}

export async function getInventoryStats() {
  const [totalItems, availableItems, pendingApproval, items] = await Promise.all([
    prisma.inventoryItem.count(),
    prisma.inventoryItem.count({ where: { status: "AVAILABLE" } }),
    prisma.inventoryItem.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.inventoryItem.findMany({ where: { status: "AVAILABLE" } }),
  ])

  const totalValue = items.reduce(
    (sum, item) => sum + Number(item.purchaseCost),
    0
  )

  return { totalItems, availableItems, pendingApproval, totalValue }
}

export async function getAllInventory() {
  const items = await prisma.inventoryItem.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
  })

  // Decimal → number so the array is serialisable to the client component
  return items.map((item) => ({
    ...item,
    purchaseCost: Number(item.purchaseCost),
    retailPrice: Number(item.retailPrice),
  }))
}

// ── Bulk upload via Excel ─────────────────────────────────────────────────

export async function getInventoryTemplateBase64() {
  const session = await auth()
  if (!session || session.user?.role === "CASHIER") {
    throw new Error("Unauthorized")
  }

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Inventory")
  sheet.columns = IMPORT_COLUMNS.map((col) => ({
    header: col.header,
    key: col.key,
    width: Math.max(col.header.length, col.example.length) + 4,
  }))
  sheet.getRow(1).font = { bold: true }
  sheet.addRow(Object.fromEntries(IMPORT_COLUMNS.map((c) => [c.key, c.example])))

  const buffer = await workbook.xlsx.writeBuffer()
  return {
    base64: Buffer.from(buffer).toString("base64"),
    filename: "inventory-import-template.xlsx",
  }
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text
    if ("result" in value) return String(value.result ?? "")
    if (value instanceof Date) return value.toISOString()
    return ""
  }
  return String(value)
}

export async function parseInventoryExcel(formData: FormData) {
  const session = await auth()
  if (!session || session.user?.role === "CASHIER") {
    throw new Error("Unauthorized")
  }

  const file = formData.get("file") as File | null
  if (!file || file.size === 0) throw new Error("No file provided")

  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = new ExcelJS.Workbook()
  try {
    // exceljs's .d.ts predates @types/node's generic Buffer<T> — same runtime type.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any)
  } catch {
    throw new Error("Could not read this file — please upload a valid .xlsx file.")
  }

  const sheet = workbook.worksheets[0]
  if (!sheet || sheet.rowCount < 2) {
    throw new Error("The file has no data rows below the header.")
  }

  const headerRow = (sheet.getRow(1).values as ExcelJS.CellValue[]).map((v) =>
    cellText(v)
  )
  // exceljs row.values is 1-indexed (index 0 is unused) — drop it
  const { columnMap, missingRequired } = matchColumns(headerRow.slice(1))
  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required column(s): ${missingRequired.join(", ")}. Use the template to avoid header mismatches.`
    )
  }

  const valid: InventoryImportRow[] = []
  const invalid: InvalidImportRow[] = []
  const seenInFile = new Set<string>()
  let rowsSeen = 0

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    if (rowsSeen >= MAX_IMPORT_ROWS) return
    rowsSeen++

    const raw: Record<string, string> = {}
    columnMap.forEach((key, colIndex) => {
      raw[key] = cellText(row.getCell(colIndex + 1).value)
    })

    // Skip fully blank rows (common at the end of a spreadsheet)
    if (Object.values(raw).every((v) => !v.trim())) {
      rowsSeen--
      return
    }

    const result = validateRow(raw)
    if (!result.ok) {
      invalid.push({ rowNumber, reason: result.reason, raw })
      return
    }
    if (seenInFile.has(result.row.serialNumber)) {
      invalid.push({
        rowNumber,
        reason: `Duplicate serial number "${result.row.serialNumber}" elsewhere in this file`,
        raw,
      })
      return
    }
    seenInFile.add(result.row.serialNumber)
    valid.push(result.row)
  })

  if (rowsSeen >= MAX_IMPORT_ROWS) {
    invalid.push({
      rowNumber: -1,
      reason: `File has more than ${MAX_IMPORT_ROWS} rows — only the first ${MAX_IMPORT_ROWS} were processed. Split it into multiple files.`,
      raw: {},
    })
  }

  return { valid, invalid, totalRows: rowsSeen }
}

export async function bulkAddInventoryItems(rows: InventoryImportRow[]) {
  const session = await auth()
  if (!session || session.user?.role === "CASHIER") {
    throw new Error("Unauthorized")
  }
  if (rows.length === 0) throw new Error("No rows to import")
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new Error(`Cannot import more than ${MAX_IMPORT_ROWS} rows at once`)
  }

  const serialNumbers = rows.map((r) => r.serialNumber)
  const existing = await prisma.inventoryItem.findMany({
    where: { serialNumber: { in: serialNumbers } },
    select: { serialNumber: true },
  })
  const existingSet = new Set(existing.map((e) => e.serialNumber))

  const toInsert = rows.filter((r) => !existingSet.has(r.serialNumber))
  const skipped = rows
    .filter((r) => existingSet.has(r.serialNumber))
    .map((r) => r.serialNumber)

  if (toInsert.length > 0) {
    await prisma.inventoryItem.createMany({
      data: toInsert.map((r) => ({
        ...r,
        lotNumber: r.lotNumber?.trim() || null,
        status: "PENDING_APPROVAL",
        createdById: session.user.id,
      })),
      skipDuplicates: true,
    })
  }

  revalidatePath("/inventory")
  revalidatePath("/data-entry")
  return { created: toInsert.length, skipped }
}
