"use client"

import { useState, useRef } from "react"
import {
  listStockTakeSessions,
  startStockTakeSession,
  recordStockTakeScan,
  closeStockTakeSession,
  getStockTakeReport,
} from "@/actions/stocktake"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { cn } from "@/lib/utils"
import {
  Scan,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  StopCircle,
  Loader2,
  ClipboardList,
} from "lucide-react"

type SessionSummary = Awaited<ReturnType<typeof listStockTakeSessions>>[number]
type Report = Awaited<ReturnType<typeof getStockTakeReport>>
type ScanFeedItem = Awaited<ReturnType<typeof recordStockTakeScan>> & { id: number }

export function StockTakeBoard({ initialSessions }: { initialSessions: SessionSummary[] }) {
  const [sessions, setSessions] = useState(initialSessions)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scanInput, setScanInput] = useState("")
  const [feed, setFeed] = useState<ScanFeedItem[]>([])
  const [report, setReport] = useState<Report | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const scanInputRef = useRef<HTMLInputElement>(null)
  const feedIdRef = useRef(0)

  const selected = sessions.find((s) => s.id === selectedId) ?? null

  const refetchSessions = async () => setSessions(await listStockTakeSessions())

  const handleStart = async () => {
    setIsStarting(true)
    try {
      const created = await startStockTakeSession()
      await refetchSessions()
      setSelectedId(created.id)
      setFeed([])
      setReport(null)
      toast.success("Stock-take session started")
    } catch {
      toast.error("Failed to start session")
    } finally {
      setIsStarting(false)
    }
  }

  const selectSession = async (s: SessionSummary) => {
    setSelectedId(s.id)
    setFeed([])
    if (s.status === "CLOSED") {
      setReport(await getStockTakeReport(s.id))
    } else {
      setReport(null)
      setTimeout(() => scanInputRef.current?.focus(), 50)
    }
  }

  const handleScan = async (raw: string) => {
    const serial = raw.trim()
    if (!serial || !selectedId) return
    setScanInput("")
    try {
      const result = await recordStockTakeScan({ sessionId: selectedId, serialNumber: serial })
      feedIdRef.current += 1
      setFeed((prev) => [{ ...result, id: feedIdRef.current }, ...prev].slice(0, 30))
      await refetchSessions()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Scan failed")
    } finally {
      scanInputRef.current?.focus()
    }
  }

  const handleClose = async () => {
    if (!selectedId) return
    setIsClosing(true)
    try {
      await closeStockTakeSession(selectedId)
      await refetchSessions()
      setReport(await getStockTakeReport(selectedId))
      toast.success("Session closed", { description: "Report generated below." })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to close session")
    } finally {
      setIsClosing(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      {/* ── Sessions list ── */}
      <Card className="border-slate-200 shadow-sm h-fit">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">Sessions</CardTitle>
          <Button size="sm" onClick={handleStart} disabled={isStarting}>
            {isStarting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
            New
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {sessions.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">No sessions yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectSession(s)}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors",
                    selectedId === s.id && "bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                        s.status === "OPEN" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {s.status}
                    </span>
                    <span className="text-xs text-slate-400">{s.scanCount} scanned</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{s.startedByName}</p>
                  <p className="text-[11px] text-slate-400">
                    {new Date(s.createdAt).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Detail panel ── */}
      {!selected ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-24 text-center text-slate-400">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
            Select a session, or start a new one, to begin scanning.
          </CardContent>
        </Card>
      ) : selected.status === "OPEN" ? (
        <div className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleScan(scanInput)
                }}
              >
                <div className="relative">
                  <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    ref={scanInputRef}
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Scan serial number, then press Enter…"
                    className="pl-9 font-mono h-12 text-base"
                    autoFocus
                  />
                </div>
              </form>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  <strong className="text-slate-900">{selected.scanCount}</strong> scanned this session
                </p>
                <Button variant="destructive" size="sm" onClick={handleClose} disabled={isClosing}>
                  {isClosing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <StopCircle className="w-3.5 h-3.5 mr-1.5" />}
                  Close Session &amp; Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900">Live Scan Feed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {feed.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Nothing scanned yet.</p>
              ) : (
                feed.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 text-sm py-1.5 border-b border-slate-50 last:border-0">
                    {f.outcome === "MATCHED" && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                    {f.outcome === "ALREADY_COUNTED" && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                    {f.outcome === "UNRECOGNIZED" && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                    {f.outcome === "STATUS_MISMATCH" && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                    <span className="font-mono text-xs text-slate-500">{f.serialNumber}</span>
                    <span className="text-slate-400">—</span>
                    <span className="text-slate-700">
                      {f.outcome === "MATCHED" && `Matched: ${f.modelName}`}
                      {f.outcome === "ALREADY_COUNTED" && "Already counted this session"}
                      {f.outcome === "UNRECOGNIZED" && "Not found in inventory"}
                      {f.outcome === "STATUS_MISMATCH" && `Found, but marked ${f.status} (not AVAILABLE)`}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <StockTakeReportView report={report} />
      )}
    </div>
  )
}

function StockTakeReportView({ report }: { report: Report | null }) {
  if (!report) return null

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Found</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">{report.found.length}</div>
            <p className="text-xs text-slate-400 mt-1">of {report.totalExpected} expected</p>
          </CardContent>
        </Card>
        <Card className={report.missing.length > 0 ? "border-red-300 bg-red-50/40 shadow-sm" : "border-slate-200 shadow-sm"}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Missing</CardTitle>
            <XCircle className={report.missing.length > 0 ? "h-4 w-4 text-red-500" : "h-4 w-4 text-slate-400"} />
          </CardHeader>
          <CardContent>
            <div className={report.missing.length > 0 ? "text-2xl font-black text-red-600" : "text-2xl font-black text-slate-900"}>
              {report.missing.length}
            </div>
            <p className="text-xs text-slate-400 mt-1">Expected but never scanned</p>
          </CardContent>
        </Card>
        <Card className={report.unrecognized.length > 0 ? "border-amber-300 bg-amber-50/40 shadow-sm" : "border-slate-200 shadow-sm"}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Unrecognized</CardTitle>
            <AlertTriangle className={report.unrecognized.length > 0 ? "h-4 w-4 text-amber-500" : "h-4 w-4 text-slate-400"} />
          </CardHeader>
          <CardContent>
            <div className={report.unrecognized.length > 0 ? "text-2xl font-black text-amber-600" : "text-2xl font-black text-slate-900"}>
              {report.unrecognized.length}
            </div>
            <p className="text-xs text-slate-400 mt-1">Scanned but not AVAILABLE / not in system</p>
          </CardContent>
        </Card>
      </div>

      {report.missing.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-red-600">Missing Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="pl-6 text-xs">Serial</TableHead>
                  <TableHead className="text-xs">Model</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.missing.map((m) => (
                  <TableRow key={m.serialNumber} className="border-slate-100">
                    <TableCell className="pl-6 font-mono text-sm">{m.serialNumber}</TableCell>
                    <TableCell className="text-sm">{m.modelName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {report.unrecognized.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-amber-600">Unrecognized Scans</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="pl-6 text-xs">Serial</TableHead>
                  <TableHead className="text-xs">Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.unrecognized.map((u) => (
                  <TableRow key={u.serialNumber} className="border-slate-100">
                    <TableCell className="pl-6 font-mono text-sm">{u.serialNumber}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {u.recognized ? "In system, but not AVAILABLE" : "Not in inventory at all"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
