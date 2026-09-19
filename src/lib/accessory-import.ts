// Shared between the Excel template generator and the bulk-upload parser
// (kept out of src/actions/accessories.ts because "use server" files may
// only export async functions — no plain constants/helpers). Mirrors the
// shape of src/lib/inventory-import.ts but for quantity-based accessories:
// no serial number, a barcode that may already exist on the sheet or be
// left blank for us to generate.

export type AccessoryImportRow = {
  name: string
  quantity: number
  sellingPrice: number
  // Present when the sheet already had a real barcode for this row.
  // Absent (undefined) means "generate one at import time".
  barcode?: string
}

export type InvalidAccessoryRow = {
  rowNumber: number
  reason: string
  raw: Record<string, string>
}

export const MAX_IMPORT_ROWS = 1000

type ColumnDef = {
  key: "name" | "quantity" | "sellingPrice" | "barcode"
  header: string
  required: boolean
  kind: "text" | "number"
  aliases: string[]
  example: string
}

export const IMPORT_COLUMNS: ColumnDef[] = [
  { key: "name", header: "Description", required: true, kind: "text", aliases: ["name", "product", "item", "productname"], example: "CAR HOLDER H820 MAGNETIC" },
  { key: "quantity", header: "QTY", required: true, kind: "number", aliases: ["qty", "quantity", "stock"], example: "2" },
  { key: "sellingPrice", header: "Price", required: true, kind: "number", aliases: ["sellingprice", "saleprice", "unitprice", "sale"], example: "39.9" },
  { key: "barcode", header: "Code", required: false, kind: "text", aliases: ["barcode", "code", "sku"], example: "6932746800030" },
]

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "")
}

/** Maps each spreadsheet column index -> AccessoryImportRow key, by matching header text (case/punctuation-insensitive). */
export function matchColumns(headerRow: string[]): {
  columnMap: Map<number, ColumnDef["key"]>
  missingRequired: string[]
} {
  const columnMap = new Map<number, ColumnDef["key"]>()
  const found = new Set<ColumnDef["key"]>()

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

// A blank code, or the sheet's "NA" placeholder for "no barcode on this item".
function isBlankBarcode(raw: string): boolean {
  const t = raw.trim()
  return t === "" || t.toUpperCase() === "NA" || t.toUpperCase() === "N/A"
}

/** Validates one already-column-mapped row of raw strings. Returns a clean row or a reason string. */
export function validateRow(
  raw: Record<string, string>
): { ok: true; row: AccessoryImportRow } | { ok: false; reason: string } {
  if (!raw.name?.trim()) return { ok: false, reason: `Missing "Description"` }

  const quantity = Number(raw.quantity)
  if (!Number.isFinite(quantity) || quantity < 0 || !Number.isInteger(quantity)) {
    return { ok: false, reason: `Invalid "QTY" value: "${raw.quantity}"` }
  }

  const sellingPrice = Number(raw.sellingPrice)
  if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
    return { ok: false, reason: `Invalid "Price" value: "${raw.sellingPrice}"` }
  }

  const barcode = raw.barcode && !isBlankBarcode(raw.barcode) ? raw.barcode.trim() : undefined

  return {
    ok: true,
    row: { name: raw.name.trim(), quantity, sellingPrice, barcode },
  }
}
