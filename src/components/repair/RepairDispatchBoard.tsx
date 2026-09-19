"use client"

import { useState } from "react"
import { lookupInventoryItem } from "@/actions/pos"
import { dispatchToRepair, listActiveDispatches, getTechnicianLedger, getDeliveryOrderExcel } from "@/actions/repair"
import { AddTechnicianDialog } from "@/components/repair/AddTechnicianDialog"
import { ReturnFromRepairDialog } from "@/components/repair/ReturnFromRepairDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { Scan, Trash2, Send, Download, AlertTriangle, Wrench, Loader2 } from "lucide-react"

type Technician = { id: string; name: string; phone: string | null; specialty: string | null }
type ActiveDispatch = {
  id: string
  serialNumber: string
  modelName: string
  technicianId: string
  technicianName: string
  remarks: string | null
  expectedReturnDate: string | null
  dispatchedAt: string
}
type LedgerRow = { id: string; name: string; jobsCompleted: number; allTimeCost: number; monthToDateCost: number }

type StagedItem = {
  serialNumber: string
  modelName: string
  remarks: string
  expectedReturnDate: string
}

function downloadBase64Xlsx(base64: string, filename: string) {
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
}

export function RepairDispatchBoard({
  technicians: initialTechnicians,
  initialActiveDispatches,
  initialLedger,
}: {
  technicians: Technician[]
  initialActiveDispatches: ActiveDispatch[]
  initialLedger: LedgerRow[]
}) {
  const [technicians, setTechnicians] = useState(initialTechnicians)
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>(initialTechnicians[0]?.id ?? "")
  const [scanInput, setScanInput] = useState("")
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [staged, setStaged] = useState<StagedItem[]>([])
  const [isSending, setIsSending] = useState(false)
  const [lastBatchId, setLastBatchId] = useState<string | null>(null)

  const [activeDispatches, setActiveDispatches] = useState(initialActiveDispatches)
  const [ledger, setLedger] = useState(initialLedger)
  const [returnTarget, setReturnTarget] = useState<ActiveDispatch | null>(null)

  const refetch = async () => {
    const [active, ledgerData] = await Promise.all([listActiveDispatches(), getTechnicianLedger()])
    setActiveDispatches(active)
    setLedger(ledgerData)
  }

  const handleScan = async (raw: string) => {
    const serial = raw.trim()
    if (!serial) return
    if (staged.some((s) => s.serialNumber === serial)) {
      toast.warning("Already staged", { description: serial })
      return
    }
    setIsLookingUp(true)
    try {
      const item = await lookupInventoryItem(serial)
      if (!item) {
        toast.error("Not found", { description: `"${serial}" does not exist in inventory.` })
        return
      }
      if (item.status !== "AVAILABLE") {
        toast.error("Not available", { description: `"${item.modelName}" is currently ${item.status}.` })
        return
      }
      setStaged((prev) => [...prev, { serialNumber: item.serialNumber, modelName: item.modelName, remarks: "", expectedReturnDate: "" }])
    } catch {
      toast.error("Lookup failed")
    } finally {
      setIsLookingUp(false)
      setScanInput("")
    }
  }

  const removeStaged = (serialNumber: string) => {
    setStaged((prev) => prev.filter((s) => s.serialNumber !== serialNumber))
  }

  const updateStaged = (serialNumber: string, field: "remarks" | "expectedReturnDate", value: string) => {
    setStaged((prev) => prev.map((s) => (s.serialNumber === serialNumber ? { ...s, [field]: value } : s)))
  }

  const handleSend = async () => {
    if (!selectedTechnicianId) {
      toast.error("Select a technician first")
      return
    }
    if (staged.length === 0) return
    setIsSending(true)
    try {
      const result = await dispatchToRepair({
        technicianId: selectedTechnicianId,
        items: staged.map((s) => ({
          serialNumber: s.serialNumber,
          remarks: s.remarks || undefined,
          expectedReturnDate: s.expectedReturnDate || undefined,
        })),
      })
      setLastBatchId(result.batchId)
      setStaged([])
      toast.success("Sent to technician", { description: `${staged.length} item(s) dispatched.` })
      await refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dispatch failed")
    } finally {
      setIsSending(false)
    }
  }

  const handleDownload = async (batchId: string) => {
    try {
      const { base64, filename } = await getDeliveryOrderExcel(batchId)
      downloadBase64Xlsx(base64, filename)
    } catch {
      toast.error("Failed to generate delivery order")
    }
  }

  const isOverdue = (d: ActiveDispatch) =>
    !!d.expectedReturnDate && new Date(d.expectedReturnDate) < new Date()

  return (
    <div className="space-y-6">
      {/* ── Dispatch panel ── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-slate-900">Send Units to Repair</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 min-w-[220px]">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Technician</label>
              <Select value={selectedTechnicianId} onValueChange={(v) => setSelectedTechnicianId(v ?? "")}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}{t.specialty ? ` — ${t.specialty}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AddTechnicianDialog onCreated={(t) => { setTechnicians((prev) => [...prev, t]); setSelectedTechnicianId(t.id) }} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleScan(scanInput)
            }}
          >
            <div className="relative">
              <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Scan barcode or type serial number, then press Enter…"
                className="pl-9 font-mono"
                disabled={isLookingUp}
              />
            </div>
          </form>

          {staged.length > 0 && (
            <div className="space-y-3">
              {staged.map((s) => (
                <div key={s.serialNumber} className="flex items-start gap-3 border border-slate-200 rounded-lg p-3">
                  <div className="min-w-[160px]">
                    <p className="font-semibold text-sm text-slate-900">{s.modelName}</p>
                    <p className="text-[11px] font-mono text-slate-400">{s.serialNumber}</p>
                  </div>
                  <Textarea
                    value={s.remarks}
                    onChange={(e) => updateStaged(s.serialNumber, "remarks", e.target.value)}
                    placeholder="Remarks — what's wrong with this unit?"
                    rows={1}
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    value={s.expectedReturnDate}
                    onChange={(e) => updateStaged(s.serialNumber, "expectedReturnDate", e.target.value)}
                    className="w-40"
                    title="Expected return date (optional)"
                  />
                  <button
                    onClick={() => removeStaged(s.serialNumber)}
                    className="p-2 text-slate-300 hover:text-red-500"
                    aria-label={`Remove ${s.serialNumber}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <Button onClick={handleSend} disabled={isSending} className="w-full">
                {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send {staged.length} Item{staged.length > 1 ? "s" : ""} to Technician
              </Button>
            </div>
          )}

          {lastBatchId && (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
              <p className="text-sm text-emerald-700 font-medium">Dispatch sent — download the delivery order for the technician.</p>
              <Button variant="outline" size="sm" onClick={() => handleDownload(lastBatchId)}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Delivery Order (Excel)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Currently with technicians ── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-slate-900">Currently With Technicians</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="pl-6 text-xs">Laptop</TableHead>
                <TableHead className="text-xs">Technician</TableHead>
                <TableHead className="text-xs">Remarks</TableHead>
                <TableHead className="text-xs">Dispatched</TableHead>
                <TableHead className="text-xs">Expected Back</TableHead>
                <TableHead className="text-xs text-right pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeDispatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                    Nothing currently out for repair.
                  </TableCell>
                </TableRow>
              ) : (
                activeDispatches.map((d) => (
                  <TableRow key={d.id} className="border-slate-100 hover:bg-slate-50/50">
                    <TableCell className="pl-6">
                      <div className="font-semibold text-sm text-slate-900">{d.modelName}</div>
                      <div className="text-[11px] font-mono text-slate-400">{d.serialNumber}</div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">{d.technicianName}</TableCell>
                    <TableCell className="text-sm text-slate-500 max-w-[220px] truncate">{d.remarks ?? "—"}</TableCell>
                    <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                      {new Date(d.dispatchedAt).toLocaleDateString("en-MY", { dateStyle: "medium" })}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {d.expectedReturnDate ? (
                        <span className={isOverdue(d) ? "inline-flex items-center gap-1 text-amber-600 font-semibold" : "text-slate-500"}>
                          {isOverdue(d) && <AlertTriangle className="h-3.5 w-3.5" />}
                          {new Date(d.expectedReturnDate).toLocaleDateString("en-MY", { dateStyle: "medium" })}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="outline" size="sm" onClick={() => setReturnTarget(d)}>
                        <Wrench className="w-3.5 h-3.5 mr-1.5" /> Mark Returned
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Technician cost ledger ── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-slate-900">Technician Cost Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="pl-6 text-xs">Technician</TableHead>
                <TableHead className="text-xs">Jobs Completed</TableHead>
                <TableHead className="text-xs">Month-to-Date</TableHead>
                <TableHead className="text-xs pr-6">All-Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-slate-400">
                    No technicians yet.
                  </TableCell>
                </TableRow>
              ) : (
                ledger.map((l) => (
                  <TableRow key={l.id} className="border-slate-100 hover:bg-slate-50/50">
                    <TableCell className="pl-6 font-semibold text-sm text-slate-900">{l.name}</TableCell>
                    <TableCell className="text-sm text-slate-500">{l.jobsCompleted}</TableCell>
                    <TableCell className="text-sm font-semibold text-slate-800">RM {l.monthToDateCost.toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-semibold text-slate-800 pr-6">RM {l.allTimeCost.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ReturnFromRepairDialog
        dispatch={returnTarget}
        onClose={() => setReturnTarget(null)}
        onReturned={async () => {
          setReturnTarget(null)
          await refetch()
        }}
      />
    </div>
  )
}
