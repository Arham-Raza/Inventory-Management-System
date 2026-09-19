"use client"

import { useState } from "react"
import {
  getComponentMovements,
  type ComponentMovementsReport as ReportData,
} from "@/actions/componentMovements"
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
import { Laptop, Repeat, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function ComponentMovementsReport({
  initialReport,
  defaultFrom,
  defaultTo,
}: {
  initialReport: ReportData
  defaultFrom: string
  defaultTo: string
}) {
  const [report, setReport] = useState(initialReport)
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [loading, setLoading] = useState(false)

  const handleApply = async () => {
    setLoading(true)
    try {
      const fromDate = new Date(`${from}T00:00:00`)
      const toDate = new Date(`${to}T23:59:59.999`)
      const data = await getComponentMovements(fromDate.toISOString(), toDate.toISOString())
      setReport(data)
    } catch {
      toast.error("Failed to load report", { description: "Could not reach the server." })
    } finally {
      setLoading(false)
    }
  }

  const { summary, byStaff, rows } = report

  return (
    <div className="space-y-6">
      {/* Date range */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-white" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-white" />
        </div>
        <Button onClick={handleApply} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Apply
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Laptops Sold</CardTitle>
            <Laptop className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{summary.totalLaptopsSold}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Component Swaps</CardTitle>
            <Repeat className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{summary.totalSwaps}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Accounted For</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">{summary.accountedCount}</div>
            <p className="text-xs text-slate-400 mt-1">Routed to spare-parts stock</p>
          </CardContent>
        </Card>
        <Card className={summary.unaccountedCount > 0 ? "border-amber-300 shadow-sm bg-amber-50/40" : "border-slate-200 shadow-sm"}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Unaccounted</CardTitle>
            <AlertTriangle className={summary.unaccountedCount > 0 ? "h-4 w-4 text-amber-500" : "h-4 w-4 text-slate-400"} />
          </CardHeader>
          <CardContent>
            <div className={summary.unaccountedCount > 0 ? "text-2xl font-black text-amber-600" : "text-2xl font-black text-slate-900"}>
              {summary.unaccountedCount}
            </div>
            <p className="text-xs text-slate-400 mt-1">No price-list entry for the removed part</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-staff breakdown */}
      {byStaff.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-slate-900">Swaps by Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {byStaff.map((s) => (
                <span
                  key={s.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700"
                >
                  {s.name}
                  <span className="text-slate-400">·</span>
                  {s.count}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Movement table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-slate-900">Swap Detail</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="pl-6 text-xs">Date</TableHead>
                <TableHead className="text-xs">Cashier</TableHead>
                <TableHead className="text-xs">Laptop</TableHead>
                <TableHead className="text-xs">Component</TableHead>
                <TableHead className="text-xs">Original → Sold</TableHead>
                <TableHead className="text-xs text-right pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                    No component swaps in this date range.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r, i) => (
                  <TableRow key={`${r.orderId}-${r.component}-${i}`} className="border-slate-100 hover:bg-slate-50/50">
                    <TableCell className="pl-6 text-sm text-slate-500 whitespace-nowrap">
                      {new Date(r.orderDate).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">{r.cashierName}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-semibold text-slate-900">{r.modelName}</div>
                      <div className="text-[11px] font-mono text-slate-400">{r.serialNumber}</div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          r.component === "RAM"
                            ? "bg-violet-50 text-violet-700 border border-violet-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {r.component}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-700 font-mono">
                      {r.from} → {r.to}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      {r.status === "ACCOUNTED" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Accounted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                          <AlertTriangle className="h-3.5 w-3.5" /> Unaccounted
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
