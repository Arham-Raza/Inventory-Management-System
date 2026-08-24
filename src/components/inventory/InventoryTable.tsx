"use client"

import { useMemo, useState } from "react"
import {
  approveInventoryItem,
  rejectInventoryItem,
  type getAllInventory,
} from "@/actions/inventory"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { printAtSize } from "@/lib/print"
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  Ban,
  Search,
  Printer,
} from "lucide-react"

type InventoryItem = Awaited<ReturnType<typeof getAllInventory>>[number]

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING_APPROVAL", label: "Pending Approval" },
  { value: "AVAILABLE", label: "Available" },
  { value: "SOLD", label: "Sold" },
  { value: "RETURNED", label: "Returned" },
  { value: "REJECTED", label: "Rejected" },
]

function StatusChip({ status }: { status: string }) {
  const styles: Record<string, string> = {
    AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    RETURNED: "bg-amber-50 text-amber-700 border-amber-200",
    SOLD: "bg-slate-100 text-slate-500 border-slate-200",
    PENDING_APPROVAL: "bg-blue-50 text-blue-700 border-blue-200",
    REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  }
  const icons: Record<string, React.ReactNode> = {
    AVAILABLE: <CheckCircle className="h-3 w-3" />,
    RETURNED: <RotateCcw className="h-3 w-3" />,
    SOLD: <XCircle className="h-3 w-3" />,
    PENDING_APPROVAL: <Clock className="h-3 w-3" />,
    REJECTED: <Ban className="h-3 w-3" />,
  }
  const labels: Record<string, string> = {
    AVAILABLE: "Available",
    RETURNED: "Returned",
    SOLD: "Sold",
    PENDING_APPROVAL: "Pending Approval",
    REJECTED: "Rejected",
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
        styles[status] ?? "bg-slate-100 text-slate-500 border-slate-200"
      }`}
    >
      {icons[status]}
      {labels[status] ?? status}
    </span>
  )
}

function ApprovalActions({
  serialNumber,
  onDone,
}: {
  serialNumber: string
  onDone: () => void
}) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null)

  const handleApprove = async () => {
    setLoading("approve")
    try {
      await approveInventoryItem(serialNumber)
      toast.success(`"${serialNumber}" approved — now available at POS`)
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve item")
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async () => {
    setLoading("reject")
    try {
      await rejectInventoryItem(serialNumber)
      toast.success(`"${serialNumber}" rejected`)
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject item")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex justify-end gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={loading !== null}
        onClick={handleReject}
        className="h-7 px-2.5 text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
      >
        {loading === "reject" ? "…" : "Reject"}
      </Button>
      <Button
        size="sm"
        disabled={loading !== null}
        onClick={handleApprove}
        className="h-7 px-2.5 text-xs bg-emerald-600 text-white hover:bg-emerald-700"
      >
        {loading === "approve" ? "…" : "Approve"}
      </Button>
    </div>
  )
}

function BarcodeLabelDialog({
  item,
  onClose,
}: {
  item: { serialNumber: string; modelName: string } | null
  onClose: () => void
}) {
  const handlePrint = () => printAtSize("50mm 25mm")

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[380px] text-center">
        <DialogHeader>
          <DialogTitle>Print Barcode Label</DialogTitle>
        </DialogHeader>
        {item && (
          <>
            <p className="text-sm text-slate-500 -mt-2">{item.modelName}</p>
            <div className="border-2 border-dashed border-gray-200 p-8 rounded-xl bg-white inline-block mx-auto">
              <Barcode value={item.serialNumber} width={2} height={60} fontSize={14} />
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
            <div className="barcode-sticker-container hidden print:flex absolute top-0 left-0 w-[50mm] h-[25mm] items-center justify-center bg-white text-black p-1">
              <Barcode value={item.serialNumber} width={1.2} height={30} fontSize={10} margin={0} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function InventoryTable({
  items,
  canApprove,
}: {
  items: InventoryItem[]
  canApprove: boolean
}) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [printItem, setPrintItem] = useState<{ serialNumber: string; modelName: string } | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false
      if (!q) return true
      return (
        item.serialNumber.toLowerCase().includes(q) ||
        (item.lotNumber?.toLowerCase().includes(q) ?? false) ||
        item.modelName.toLowerCase().includes(q)
      )
    })
  }, [items, search, statusFilter])

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 px-6 pb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search serial, lot / ref #, or model…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "ALL")}>
          <SelectTrigger className="w-full sm:w-48 bg-white border-slate-200">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-400 self-center sm:ml-auto">
          {filtered.length} of {items.length} units
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-slate-100">
            <TableHead className="pl-6 text-xs">Serial Number</TableHead>
            <TableHead className="text-xs">Lot / Ref #</TableHead>
            <TableHead className="text-xs">Model</TableHead>
            <TableHead className="text-xs">Processor</TableHead>
            <TableHead className="text-xs">GPU</TableHead>
            <TableHead className="text-xs">RAM</TableHead>
            <TableHead className="text-xs">Storage</TableHead>
            <TableHead className="text-xs text-right">Cost</TableHead>
            <TableHead className="text-xs text-right">Retail</TableHead>
            <TableHead className="text-xs">Added By</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs text-right">Label</TableHead>
            {canApprove && (
              <TableHead className="text-xs pr-6 text-right">Approval</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={canApprove ? 12 : 11}
                className="text-center py-12 text-slate-400"
              >
                {items.length === 0
                  ? 'No items in inventory. Use the "Receive Stock" portal to add units.'
                  : "No items match your search / filter."}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((item) => (
              <TableRow
                key={item.serialNumber}
                className="border-slate-100 hover:bg-slate-50/50"
              >
                <TableCell className="pl-6 font-mono text-xs font-bold text-slate-700">
                  {item.serialNumber}
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-500">
                  {item.lotNumber ?? (
                    <span className="text-slate-300">—</span>
                  )}
                </TableCell>
                <TableCell className="font-medium text-sm text-slate-900">
                  {item.modelName}
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {item.processor}
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {item.gpu}
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {item.ram}
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {item.storage}
                </TableCell>
                <TableCell className="text-right text-sm text-slate-500">
                  {item.purchaseCost.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-sm font-bold text-primary">
                  {item.retailPrice.toLocaleString()}
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {item.createdBy?.name ?? "—"}
                </TableCell>
                <TableCell>
                  <StatusChip status={item.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-slate-400 hover:text-primary"
                    onClick={() =>
                      setPrintItem({ serialNumber: item.serialNumber, modelName: item.modelName })
                    }
                    aria-label={`Print label for ${item.serialNumber}`}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </TableCell>
                {canApprove && (
                  <TableCell className="pr-6">
                    {item.status === "PENDING_APPROVAL" ? (
                      <ApprovalActions
                        serialNumber={item.serialNumber}
                        onDone={() => {}}
                      />
                    ) : (
                      <p className="text-right text-xs text-slate-400">
                        {item.approvedBy?.name
                          ? `by ${item.approvedBy.name}`
                          : "—"}
                      </p>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <BarcodeLabelDialog item={printItem} onClose={() => setPrintItem(null)} />
    </>
  )
}
