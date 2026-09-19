"use client"

import { useRef, useState } from "react"
import {
  getAccessoryTemplateBase64,
  parseAccessoryExcel,
  bulkAddAccessories,
} from "@/actions/accessories"
import type { AccessoryImportRow, InvalidAccessoryRow } from "@/lib/accessory-import"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/money"
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react"

type ParseResult = {
  valid: AccessoryImportRow[]
  invalid: InvalidAccessoryRow[]
  totalRows: number
}

type ImportResult = { created: number; generatedBarcodes: number; skipped: string[] }

const PREVIEW_LIMIT = 25

export function AccessoryBulkUploadPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true)
    try {
      const { base64, filename } = await getAccessoryTemplateBase64()
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Failed to generate template")
    } finally {
      setDownloadingTemplate(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setParseResult(null)
    setImportResult(null)
    setParsing(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      const result = await parseAccessoryExcel(formData)
      setParseResult(result)
      if (result.valid.length === 0) {
        toast.error("No valid rows found in this file")
      } else {
        toast.success(`Parsed ${result.valid.length} valid row(s)`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse file")
    } finally {
      setParsing(false)
    }
  }

  const handleImport = async () => {
    if (!parseResult || parseResult.valid.length === 0) return
    setImporting(true)
    try {
      const result = await bulkAddAccessories(parseResult.valid)
      setImportResult(result)
      toast.success(`${result.created} item(s) imported and available at POS`, {
        description:
          result.generatedBarcodes > 0
            ? `${result.generatedBarcodes} had no barcode — auto-generated (ACC-…), print labels for those.`
            : undefined,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed")
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setFileName(null)
    setParseResult(null)
    setImportResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <Card className="max-w-3xl mx-auto shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle className="text-2xl">Bulk Upload via Excel</CardTitle>
        <CardDescription>
          Import many accessory SKUs at once. Unlike laptops, there&apos;s no approval step —
          imported accessories are sellable at the POS immediately. Rows with no barcode
          (blank or &quot;NA&quot;) get one auto-generated.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Template */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
          <div>
            <p className="text-sm font-semibold text-gray-800">1. Get the template</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Download the .xlsx template so your column headers match exactly — or just
              upload your own sheet, as long as it has Description / QTY / Price columns
              (a Code column is optional).
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
          >
            <Download className="w-4 h-4 mr-2" />
            {downloadingTemplate ? "Preparing…" : "Download Template"}
          </Button>
        </div>

        {/* Step 2: Upload */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
          <p className="text-sm font-semibold text-gray-800">2. Upload your filled-in file</p>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={parsing}
              className="text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 file:cursor-pointer"
            />
            {parsing && (
              <span className="text-xs text-gray-500 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 animate-pulse" />
                Reading {fileName}…
              </span>
            )}
          </div>
        </div>

        {/* Step 3: Preview + confirm */}
        {parseResult && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                {parseResult.valid.length} valid row(s)
              </div>
              {parseResult.invalid.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  {parseResult.invalid.length} row(s) skipped
                </div>
              )}
            </div>

            {parseResult.invalid.length > 0 && (
              <div className="rounded-xl border border-amber-200 overflow-hidden">
                <div className="px-4 py-2 bg-amber-50 text-xs font-bold uppercase tracking-wide text-amber-700">
                  Rows with errors (not imported)
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Row</TableHead>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parseResult.invalid.slice(0, PREVIEW_LIMIT).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">
                          {row.rowNumber > 0 ? row.rowNumber : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.raw.name || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-amber-700">{row.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {parseResult.valid.length > 0 && (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 text-xs font-bold uppercase tracking-wide text-gray-600">
                  Ready to import{" "}
                  {parseResult.valid.length > PREVIEW_LIMIT &&
                    `(showing first ${PREVIEW_LIMIT} of ${parseResult.valid.length})`}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Barcode</TableHead>
                        <TableHead className="text-xs text-right">Qty</TableHead>
                        <TableHead className="text-xs text-right">Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parseResult.valid.slice(0, PREVIEW_LIMIT).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{row.name}</TableCell>
                          <TableCell className="text-xs font-mono text-gray-500">
                            {row.barcode ?? (
                              <span className="text-amber-600 font-semibold">
                                auto-generate
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-right">{row.quantity}</TableCell>
                          <TableCell className="text-xs text-right font-semibold text-primary">
                            {formatCurrency(row.sellingPrice)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {!importResult ? (
              <Button
                onClick={handleImport}
                disabled={importing || parseResult.valid.length === 0}
                className="w-full h-12 text-base font-bold bg-primary text-white hover:bg-primary/90"
              >
                <Upload className="w-4 h-4 mr-2" />
                {importing
                  ? "Importing…"
                  : `Import ${parseResult.valid.length} Item(s)`}
              </Button>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <p className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {importResult.created} item(s) imported — sellable at POS now
                </p>
                {importResult.generatedBarcodes > 0 && (
                  <p className="text-xs text-emerald-700">
                    {importResult.generatedBarcodes} item(s) had no barcode on the sheet — an
                    internal one was generated. Print labels for those from the ledger below.
                  </p>
                )}
                {importResult.skipped.length > 0 && (
                  <p className="text-xs text-emerald-700">
                    Skipped (barcode already in inventory): {importResult.skipped.join(", ")}
                  </p>
                )}
                <Button variant="outline" size="sm" onClick={handleReset} className="mt-2">
                  <RotateCcw className="w-3.5 h-3.5 mr-2" />
                  Upload Another File
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
