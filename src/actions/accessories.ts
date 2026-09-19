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
  type AccessoryImportRow,
  type InvalidAccessoryRow,
} from "@/lib/accessory-import"

function assertCanManage(role: string | undefined) {
  if (!role || !["SUPER_ADMIN", "MANAGER"].includes(role)) {
    throw new Error("Unauthorized")
  }
}

const BARCODE_PREFIX = "ACC-"
const BARCODE_DIGITS = 6

// Internally-generated SKU for accessories that had no manufacturer barcode
// on the sheet. Reserves `count` sequential codes at once (used by both the
// single-item form and bulk import) by reading the highest existing
// "ACC-NNNNNN" code and continuing from there.
async function reserveAccessoryBarcodes(count: number): Promise<string[]> {
  const existing = await prisma.accessory.findMany({
    where: { barcode: { startsWith: BARCODE_PREFIX } },
    select: { barcode: true },
  })

  let maxN = 0
  for (const { barcode } of existing) {
    const suffix = barcode.slice(BARCODE_PREFIX.length)
    if (/^\d+$/.test(suffix)) maxN = Math.max(maxN, parseInt(suffix, 10))
  }

  const codes: string[] = []
  for (let i = 1; i <= count; i++) {
    codes.push(`${BARCODE_PREFIX}${String(maxN + i).padStart(BARCODE_DIGITS, "0")}`)
  }
  return codes
}

export async function addAccessory(data: {
  name: string
  quantity: number
  sellingPrice: number
  costPrice?: number
  barcode?: string
}) {
  const session = await auth()
  assertCanManage(session?.user?.role)

  const barcode = data.barcode?.trim() || (await reserveAccessoryBarcodes(1))[0]

  const item = await prisma.accessory.create({
    data: {
      barcode,
      name: data.name.trim(),
      quantity: data.quantity,
      sellingPrice: data.sellingPrice,
      costPrice: data.costPrice ?? null,
      createdById: session!.user.id,
    },
  })

  revalidatePath("/accessories")
  return { barcode: item.barcode, name: item.name }
}

export async function adjustAccessoryQuantity(barcode: string, delta: number) {
  const session = await auth()
  assertCanManage(session?.user?.role)
  if (!Number.isInteger(delta) || delta === 0) throw new Error("Invalid adjustment")

  const result = await prisma.accessory.updateMany({
    where: { barcode, quantity: { gte: -delta } }, // no-op guard when delta >= 0
    data: { quantity: { increment: delta } },
  })

  if (result.count === 0) {
    throw new Error("Adjustment would take stock below zero, or item no longer exists.")
  }

  revalidatePath("/accessories")
}

export async function getAccessoryStats() {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const items = await prisma.accessory.findMany()
  const totalSkus = items.length
  const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalStockValue = items.reduce(
    (sum, i) => sum + i.quantity * Number(i.sellingPrice),
    0
  )
  const outOfStock = items.filter((i) => i.quantity === 0).length

  return { totalSkus, totalUnits, totalStockValue, outOfStock }
}

export async function getAllAccessories() {
  const items = await prisma.accessory.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  })

  // Decimal → number so the array is serialisable to the client component
  return items.map((item) => ({
    ...item,
    costPrice: item.costPrice ? Number(item.costPrice) : null,
    sellingPrice: Number(item.sellingPrice),
  }))
}

// ── Bulk upload via Excel ─────────────────────────────────────────────────

export async function getAccessoryTemplateBase64() {
  const session = await auth()
  assertCanManage(session?.user?.role)

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Accessories")
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
    filename: "accessories-import-template.xlsx",
  }
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((t) => t.text).join("")
    }
    if ("text" in value && typeof value.text === "string") return value.text
    if ("result" in value) return String(value.result ?? "")
    if (value instanceof Date) return value.toISOString()
    return ""
  }
  return String(value)
}

export async function parseAccessoryExcel(formData: FormData) {
  const session = await auth()
  assertCanManage(session?.user?.role)

  const file = formData.get("file") as File | null
  if (!file || file.size === 0) throw new Error("No file provided")

  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = new ExcelJS.Workbook()
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any)
  } catch {
    throw new Error("Could not read this file — please upload a valid .xlsx file.")
  }

  // If the workbook has multiple tabs (like the source "Emira Stocks" file,
  // which also carries unrelated cost/sale-history sheets), prefer a sheet
  // that actually matches our expected columns rather than blindly taking
  // the first tab.
  let sheet = workbook.worksheets[0]
  let bestMatch = { columnMap: new Map<number, "name" | "quantity" | "sellingPrice" | "barcode">(), missingRequired: IMPORT_COLUMNS.map((c) => c.header) }
  for (const ws of workbook.worksheets) {
    if (ws.rowCount < 2) continue
    const header = (ws.getRow(1).values as ExcelJS.CellValue[]).map((v) => cellText(v)).slice(1)
    const attempt = matchColumns(header)
    if (attempt.missingRequired.length < bestMatch.missingRequired.length) {
      bestMatch = attempt
      sheet = ws
    }
    if (attempt.missingRequired.length === 0) break
  }

  if (!sheet || sheet.rowCount < 2) {
    throw new Error("The file has no data rows below the header.")
  }
  const { columnMap, missingRequired } = bestMatch
  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required column(s): ${missingRequired.join(", ")}. Use the template to avoid header mismatches.`
    )
  }

  const valid: AccessoryImportRow[] = []
  const invalid: InvalidAccessoryRow[] = []
  // Same barcode appearing twice in the file (e.g. an accidental duplicate
  // row) is merged into a single row with combined quantity, rather than
  // rejected — that matches how a physical recount would be entered.
  const mergedByBarcode = new Map<string, AccessoryImportRow>()
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

    if (result.row.barcode) {
      const dupe = mergedByBarcode.get(result.row.barcode)
      if (dupe) {
        dupe.quantity += result.row.quantity
        return
      }
      mergedByBarcode.set(result.row.barcode, result.row)
    }
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

export async function bulkAddAccessories(rows: AccessoryImportRow[]) {
  const session = await auth()
  assertCanManage(session?.user?.role)
  if (rows.length === 0) throw new Error("No rows to import")
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new Error(`Cannot import more than ${MAX_IMPORT_ROWS} rows at once`)
  }

  const barcodedRows = rows.filter((r) => r.barcode)
  const barcodes = barcodedRows.map((r) => r.barcode!)
  const existing = await prisma.accessory.findMany({
    where: { barcode: { in: barcodes } },
    select: { barcode: true },
  })
  const existingSet = new Set(existing.map((e) => e.barcode))

  const toInsert = rows.filter((r) => !r.barcode || !existingSet.has(r.barcode))
  const skipped = rows
    .filter((r) => r.barcode && existingSet.has(r.barcode))
    .map((r) => `${r.name} (${r.barcode})`)

  const needsGenerated = toInsert.filter((r) => !r.barcode)
  const generatedCodes = await reserveAccessoryBarcodes(needsGenerated.length)
  let genIdx = 0

  if (toInsert.length > 0) {
    await prisma.accessory.createMany({
      data: toInsert.map((r) => ({
        barcode: r.barcode ?? generatedCodes[genIdx++],
        name: r.name,
        quantity: r.quantity,
        sellingPrice: r.sellingPrice,
        createdById: session!.user.id,
      })),
      skipDuplicates: true,
    })
  }

  revalidatePath("/accessories")
  return {
    created: toInsert.length,
    generatedBarcodes: needsGenerated.length,
    skipped,
  }
}
