// Shared between the Excel template generator and the bulk-upload parser
// (kept out of src/actions/inventory.ts because "use server" files may only
// export async functions — no plain constants/helpers).

export type InventoryImportRow = {
  serialNumber: string
  lotNumber?: string
  modelName: string
  processor: string
  gpu: string
  ram: string
  storage: string
  purchaseCost: number
  retailPrice: number
}

export type InvalidImportRow = {
  rowNumber: number
  reason: string
  raw: Record<string, string>
}

export const MAX_IMPORT_ROWS = 500

type ColumnDef = {
  key: keyof InventoryImportRow
  header: string
  required: boolean
  kind: "text" | "number"
  aliases: string[]
  example: string
}

export const IMPORT_COLUMNS: ColumnDef[] = [
  { key: "serialNumber", header: "Serial Number", required: true, kind: "text", aliases: ["serial", "serialno", "sn"], example: "SN-982374" },
  { key: "lotNumber", header: "Lot / Ref #", required: false, kind: "text", aliases: ["lot", "lotnumber", "lotref", "reference", "ref", "refno"], example: "INV-2026-014" },
  { key: "modelName", header: "Model Name", required: true, kind: "text", aliases: ["model"], example: "Dell Latitude 5420" },
  { key: "processor", header: "Processor (CPU)", required: true, kind: "text", aliases: ["cpu"], example: "Intel Core i5 11th Gen" },
  { key: "gpu", header: "GPU / Graphics", required: true, kind: "text", aliases: ["graphics"], example: "Intel Iris Xe (Integrated)" },
  { key: "ram", header: "Installed RAM", required: true, kind: "text", aliases: ["installedram"], example: "16GB DDR4" },
  { key: "storage", header: "Installed Storage", required: true, kind: "text", aliases: ["installedstorage"], example: "512GB NVMe SSD" },
  { key: "purchaseCost", header: "Purchase Cost (RM)", required: true, kind: "number", aliases: ["cost", "purchaseprice"], example: "45000" },
  { key: "retailPrice", header: "Retail Price (RM)", required: true, kind: "number", aliases: ["price", "sellingprice", "sale price"], example: "62000" },
]

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "")
}

/** Maps each spreadsheet column index -> InventoryImportRow key, by matching header text (case/punctuation-insensitive). */
export function matchColumns(headerRow: string[]): {
  columnMap: Map<number, keyof InventoryImportRow>
  missingRequired: string[]
} {
  const columnMap = new Map<number, keyof InventoryImportRow>()
  const found = new Set<keyof InventoryImportRow>()

  headerRow.forEach((raw, index) => {
    const normalized = normalizeHeader(raw ?? "")
    if (!normalized) return
    const match = IMPORT_COLUMNS.find(
      (col) =>
        normalizeHeader(col.header) === normalized ||
        col.aliases.some((a) => normalizeHeader(a) === normalized)
    )
    if (match) {
      columnMap.set(index, match.key)
      found.add(match.key)
    }
  })

  const missingRequired = IMPORT_COLUMNS.filter(
    (c) => c.required && !found.has(c.key)
  ).map((c) => c.header)

  return { columnMap, missingRequired }
}

/** Validates one already-column-mapped row of raw strings. Returns a clean row or a reason string. */
export function validateRow(
  raw: Record<string, string>
): { ok: true; row: InventoryImportRow } | { ok: false; reason: string } {
  for (const col of IMPORT_COLUMNS) {
    if (col.required && !raw[col.key]?.trim()) {
      return { ok: false, reason: `Missing "${col.header}"` }
    }
  }

  const purchaseCost = Number(raw.purchaseCost)
  const retailPrice = Number(raw.retailPrice)
  if (!Number.isFinite(purchaseCost) || purchaseCost < 0) {
    return { ok: false, reason: `Invalid "Purchase Cost" value: "${raw.purchaseCost}"` }
  }
  if (!Number.isFinite(retailPrice) || retailPrice < 0) {
    return { ok: false, reason: `Invalid "Retail Price" value: "${raw.retailPrice}"` }
  }

  return {
    ok: true,
    row: {
      serialNumber: raw.serialNumber.trim(),
      lotNumber: raw.lotNumber?.trim() || undefined,
      modelName: raw.modelName.trim(),
      processor: raw.processor.trim(),
      gpu: raw.gpu.trim(),
      ram: raw.ram.trim(),
      storage: raw.storage.trim(),
      purchaseCost,
      retailPrice,
    },
  }
}
