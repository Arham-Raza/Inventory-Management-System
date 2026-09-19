"use client"

import { useMemo, useState, useTransition } from "react"
import { adjustAccessoryQuantity, type getAllAccessories } from "@/actions/accessories"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import Barcode from "react-barcode"
import { printElementAtSize, printElementsAtSize } from "@/lib/print"
import { formatCurrency } from "@/lib/money"
import { Search, Printer, Plus, Minus, PackageX } from "lucide-react"
import { cn } from "@/lib/utils"

type Accessory = Awaited<ReturnType<typeof getAllAccessories>>[number]

function QuantityStepper({ barcode, quantity }: { barcode: string; quantity: number }) {
  const [isPending, startTransition] = useTransition()

  const adjust = (delta: number) => {
    startTransition(async () => {
      try {
        await adjustAccessoryQuantity(barcode, delta)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to adjust stock")
      }
    })
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={() => adjust(-1)}
        disabled={isPending || quantity <= 0}
        className="h-6 w-6 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
        aria-label={`Decrease stock`}
      >
        <Minus className="h-3 w-3" />
      </button>
      <span
        className={cn(
          "w-8 text-center text-sm font-bold",
          quantity === 0 ? "text-rose-500" : "text-slate-800"
        )}
      >
        {quantity}
      </span>
      <button
        onClick={() => adjust(1)}
        disabled={isPending}
        className="h-6 w-6 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
        aria-label={`Increase stock`}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}

function BarcodeLabelDialog({
  item,
  onClose,
}: {
  item: { barcode: string; name: string } | null
  onClose: () => void
}) {
  const handlePrint = () => {
    const label = document.querySelector<HTMLElement>(".barcode-sticker-container")
    if (!label) {
      toast.error("Barcode label is not ready yet")
      return
    }
    printElementAtSize(label, "50mm 25mm", {
      bodyClass: "print-barcode-label",
      title: item?.barcode ?? "Barcode Label",
    })
  }

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[380px] text-center">
        <DialogHeader>
          <DialogTitle>Print Barcode Label</DialogTitle>
        </DialogHeader>
        {item && (
          <>
            <p className="text-sm text-slate-500 -mt-2">{item.name}</p>
            <div className="border-2 border-dashed border-gray-200 p-8 rounded-xl bg-white inline-block mx-auto">
              <Barcode value={item.barcode} width={2} height={60} fontSize={14} />
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={handlePrint} className="bg-primary text-primary-foreground">
                <Printer className="w-4 h-4 mr-2" /> Print Sticker
              </Button>
            </div>

            {/* 50 × 25 mm barcode sticker — print-only */}
            <div className="barcode-sticker-container hidden w-[50mm] h-[25mm] flex-col items-center justify-center bg-white text-black p-1">
              <Barcode value={item.barcode} width={1.15} height={28} fontSize={9} margin={0} />
              <div className="text-[7px] leading-none font-semibold max-w-[46mm] truncate mt-0.5">
                {item.name}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function AccessoriesTable({ items }: { items: Accessory[] }) {
  const [search, setSearch] = useState("")
  const [printItem, setPrintItem] = useState<{ barcode: string; name: string } | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isBulkPrinting, setIsBulkPrinting] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) || item.barcode.toLowerCase().includes(q)
    )
  }, [items, search])

  const selectedItems = useMemo(
    () => filtered.filter((item) => selected.has(item.barcode)),
    [filtered, selected]
  )
  const allFilteredSelected = filtered.length > 0 && filtered.every((i) => selected.has(i.barcode))

  const toggleOne = (barcode: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(barcode)) next.delete(barcode)
      else next.add(barcode)
      return next
    })
  }

  const toggleAllFiltered = () => {
    setSelected((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev)
        filtered.forEach((i) => next.delete(i.barcode))
        return next
      }
      const next = new Set(prev)
      filtered.forEach((i) => next.add(i.barcode))
      return next
    })
  }

  const handleBulkPrint = () => {
    setIsBulkPrinting(true)
    window.setTimeout(() => {
      const labels = Array.from(
        document.querySelectorAll<HTMLElement>(".bulk-barcode-label")
      )
      if (labels.length === 0) {
        toast.error("Labels are not ready yet")
        setIsBulkPrinting(false)
        return
      }
      printElementsAtSize(labels, "50mm 25mm", {
        bodyClass: "print-barcode-label",
        title: `${labels.length} Barcode Labels`,
      })
      setIsBulkPrinting(false)
    }, 50)
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 px-6 pb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search name or barcode…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>
        {selected.size > 0 && (
          <Button
            size="sm"
            onClick={handleBulkPrint}
            disabled={isBulkPrinting}
            className="bg-primary text-primary-foreground"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print {selected.size} Label{selected.size > 1 ? "s" : ""}
          </Button>
        )}
        <p className="text-xs text-slate-400 self-center sm:ml-auto">
          {filtered.length} of {items.length} SKUs
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-slate-100">
            <TableHead className="pl-6 w-8">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleAllFiltered}
                aria-label="Select all"
                className="h-4 w-4 rounded border-slate-300"
              />
            </TableHead>
            <TableHead className="text-xs">Barcode</TableHead>
            <TableHead className="text-xs">Name</TableHead>
            <TableHead className="text-xs text-right">Selling Price</TableHead>
            <TableHead className="text-xs text-right">Cost</TableHead>
            <TableHead className="text-xs text-right">In Stock</TableHead>
            <TableHead className="text-xs">Added By</TableHead>
            <TableHead className="text-xs text-right pr-6">Label</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                {items.length === 0 ? (
                  <span className="flex flex-col items-center gap-2">
                    <PackageX className="h-8 w-8 opacity-30" />
                    No accessories yet. Add one or bulk upload a spreadsheet.
                  </span>
                ) : (
                  "No items match your search."
                )}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((item) => (
              <TableRow key={item.barcode} className="border-slate-100 hover:bg-slate-50/50">
                <TableCell className="pl-6">
                  <input
                    type="checkbox"
                    checked={selected.has(item.barcode)}
                    onChange={() => toggleOne(item.barcode)}
                    aria-label={`Select ${item.barcode}`}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </TableCell>
                <TableCell className="font-mono text-xs font-bold text-slate-700">
                  {item.barcode}
                </TableCell>
                <TableCell className="font-medium text-sm text-slate-900">
                  {item.name}
                </TableCell>
                <TableCell className="text-right text-sm font-bold text-primary">
                  {formatCurrency(item.sellingPrice)}
                </TableCell>
                <TableCell className="text-right text-sm text-slate-500">
                  {item.costPrice !== null ? formatCurrency(item.costPrice) : (
                    <span className="text-slate-300">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <QuantityStepper barcode={item.barcode} quantity={item.quantity} />
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {item.createdBy?.name ?? "—"}
                </TableCell>
                <TableCell className="text-right pr-6">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-slate-400 hover:text-primary"
                    onClick={() => setPrintItem({ barcode: item.barcode, name: item.name })}
                    aria-label={`Print label for ${item.barcode}`}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <BarcodeLabelDialog item={printItem} onClose={() => setPrintItem(null)} />

      {/* One 50×25mm label per selected item — print-only, read by handleBulkPrint */}
      {selectedItems.map((item) => (
        <div
          key={item.barcode}
          className="bulk-barcode-label barcode-sticker-container hidden w-[50mm] h-[25mm] flex-col items-center justify-center bg-white text-black p-1"
        >
          <Barcode value={item.barcode} width={1.15} height={28} fontSize={9} margin={0} />
          <div className="text-[7px] leading-none font-semibold max-w-[46mm] truncate mt-0.5">
            {item.name}
          </div>
        </div>
      ))}
    </>
  )
}
