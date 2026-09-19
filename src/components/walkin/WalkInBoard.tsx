"use client"

import { useState } from "react"
import { listActiveWalkInJobs, getWalkInStats } from "@/actions/walkin"
import { WalkInIntakeDialog } from "./WalkInIntakeDialog"
import { CompleteJobDialog } from "./CompleteJobDialog"
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
import { formatCurrency } from "@/lib/money"
import { toast } from "sonner"
import { Wrench, TrendingUp, DollarSign, ClipboardList, CheckCircle2, Loader2 } from "lucide-react"

type Technician = { id: string; name: string }
type ActiveJob = Awaited<ReturnType<typeof listActiveWalkInJobs>>[number]
type Stats = Awaited<ReturnType<typeof getWalkInStats>>

export function WalkInBoard({
  technicians,
  initialActiveJobs,
  initialStats,
  defaultFrom,
  defaultTo,
}: {
  technicians: Technician[]
  initialActiveJobs: ActiveJob[]
  initialStats: Stats
  defaultFrom: string
  defaultTo: string
}) {
  const [jobs, setJobs] = useState(initialActiveJobs)
  const [stats, setStats] = useState(initialStats)
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [loadingStats, setLoadingStats] = useState(false)
  const [completingJob, setCompletingJob] = useState<ActiveJob | null>(null)

  const refetchJobs = async () => setJobs(await listActiveWalkInJobs())

  const handleApplyRange = async () => {
    setLoadingStats(true)
    try {
      const fromDate = new Date(`${from}T00:00:00`)
      const toDate = new Date(`${to}T23:59:59.999`)
      setStats(await getWalkInStats(fromDate.toISOString(), toDate.toISOString()))
    } catch {
      toast.error("Failed to load stats")
    } finally {
      setLoadingStats(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-white" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-white" />
          </div>
          <Button variant="outline" onClick={handleApplyRange} disabled={loadingStats}>
            {loadingStats ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Apply
          </Button>
        </div>
        <WalkInIntakeDialog technicians={technicians} onCreated={refetchJobs} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Jobs Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{stats.jobsCompleted}</div>
            <p className="text-xs text-slate-400 mt-1">{stats.jobsInProgress} still in progress</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Charged</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{formatCurrency(stats.totalCharged)}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Shop Cost</CardTitle>
            <Wrench className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{formatCurrency(stats.totalShopCost)}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className={stats.totalProfit >= 0 ? "text-2xl font-black text-emerald-600" : "text-2xl font-black text-red-600"}>
              {formatCurrency(stats.totalProfit)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> In Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="pl-6 text-xs">Customer / Device</TableHead>
                <TableHead className="text-xs">Job</TableHead>
                <TableHead className="text-xs">Issue</TableHead>
                <TableHead className="text-xs">Technician</TableHead>
                <TableHead className="text-xs">Estimate</TableHead>
                <TableHead className="text-xs text-right pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                    No walk-in jobs in progress.
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((j) => (
                  <TableRow key={j.id} className="border-slate-100 hover:bg-slate-50/50">
                    <TableCell className="pl-6">
                      <div className="font-semibold text-sm text-slate-900">{j.customerName}</div>
                      <div className="text-[11px] text-slate-400">{j.deviceDescription}</div>
                      <div className="text-[11px] font-mono text-slate-400">{j.barcode}</div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">{j.jobType}</TableCell>
                    <TableCell className="text-sm text-slate-500 max-w-[200px] truncate">{j.issueDescription}</TableCell>
                    <TableCell className="text-sm text-slate-500">{j.technicianName ?? "In-house"}</TableCell>
                    <TableCell className="text-sm font-semibold text-slate-800">{formatCurrency(j.estimatedCost)}</TableCell>
                    <TableCell className="text-right pr-6">
                      <Button size="sm" onClick={() => setCompletingJob(j)}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Complete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CompleteJobDialog
        job={completingJob}
        onClose={() => setCompletingJob(null)}
        onCompleted={async () => {
          setCompletingJob(null)
          await refetchJobs()
          await handleApplyRange()
        }}
      />
    </div>
  )
}
