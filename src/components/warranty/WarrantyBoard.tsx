"use client"

import { useState } from "react"
import {
  listActiveWarrantyClaims,
  settleWarrantyClaim,
  returnWarrantyClaimToStock,
  getWarrantyReport,
} from "@/actions/warranty"
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
import { CheckCircle2, PackageCheck, ShieldCheck, Undo2, Loader2, Inbox } from "lucide-react"

type ActiveClaim = {
  id: string
  serialNumber: string
  modelName: string
  stickerPresent: boolean
  ramHddMatches: boolean
  chargerReturned: boolean
  freeGiftsReturned: boolean
  receivedAt: string
}

type Report = {
  received: number
  settled: number
  returnedToStock: number
  stillActive: number
}

export function WarrantyBoard({
  initialActiveClaims,
  initialReport,
  defaultFrom,
  defaultTo,
}: {
  initialActiveClaims: ActiveClaim[]
  initialReport: Report
  defaultFrom: string
  defaultTo: string
}) {
  const [claims, setClaims] = useState(initialActiveClaims)
  const [report, setReport] = useState(initialReport)
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [loadingReport, setLoadingReport] = useState(false)
  const [actingOnId, setActingOnId] = useState<string | null>(null)

  const refetchClaims = async () => setClaims(await listActiveWarrantyClaims())

  const handleApplyRange = async () => {
    setLoadingReport(true)
    try {
      const fromDate = new Date(`${from}T00:00:00`)
      const toDate = new Date(`${to}T23:59:59.999`)
      setReport(await getWarrantyReport(fromDate.toISOString(), toDate.toISOString()))
    } catch {
      toast.error("Failed to load report")
    } finally {
      setLoadingReport(false)
    }
  }

  const handleSettle = async (claim: ActiveClaim) => {
    setActingOnId(claim.id)
    try {
      await settleWarrantyClaim(claim.id)
      toast.success("Marked settled", { description: `${claim.modelName} shipped back to the customer.` })
      await refetchClaims()
      await handleApplyRange()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to settle claim")
    } finally {
      setActingOnId(null)
    }
  }

  const handleReturnToStock = async (claim: ActiveClaim) => {
    setActingOnId(claim.id)
    try {
      await returnWarrantyClaimToStock(claim.id)
      toast.success("Returned to stock", { description: `${claim.modelName} is sellable again.` })
      await refetchClaims()
      await handleApplyRange()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to return to stock")
    } finally {
      setActingOnId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Date range + report */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-white" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-white" />
        </div>
        <Button onClick={handleApplyRange} disabled={loadingReport}>
          {loadingReport ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Apply
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Received</CardTitle>
            <Inbox className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{report.received}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Settled</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">{report.settled}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Returned to Stock</CardTitle>
            <Undo2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-600">{report.returnedToStock}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Still Active</CardTitle>
            <PackageCheck className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600">{report.stillActive}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active claims */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-slate-900">Active Claims</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="pl-6 text-xs">Laptop</TableHead>
                <TableHead className="text-xs">Received</TableHead>
                <TableHead className="text-xs">Sticker</TableHead>
                <TableHead className="text-xs">RAM/HDD</TableHead>
                <TableHead className="text-xs">Charger</TableHead>
                <TableHead className="text-xs">Gifts</TableHead>
                <TableHead className="text-xs text-right pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                    Nothing in the warranty lane right now.
                  </TableCell>
                </TableRow>
              ) : (
                claims.map((c) => (
                  <TableRow key={c.id} className="border-slate-100 hover:bg-slate-50/50">
                    <TableCell className="pl-6">
                      <div className="font-semibold text-sm text-slate-900">{c.modelName}</div>
                      <div className="text-[11px] font-mono text-slate-400">{c.serialNumber}</div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                      {new Date(c.receivedAt).toLocaleDateString("en-MY", { dateStyle: "medium" })}
                    </TableCell>
                    <TableCell>{c.stickerPresent ? "Yes" : "No"}</TableCell>
                    <TableCell>{c.ramHddMatches ? "Yes" : "No"}</TableCell>
                    <TableCell>{c.chargerReturned ? "Yes" : "No"}</TableCell>
                    <TableCell>{c.freeGiftsReturned ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actingOnId === c.id}
                          onClick={() => handleReturnToStock(c)}
                        >
                          <Undo2 className="w-3.5 h-3.5 mr-1.5" /> Return to Stock
                        </Button>
                        <Button size="sm" disabled={actingOnId === c.id} onClick={() => handleSettle(c)}>
                          <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Settle
                        </Button>
                      </div>
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
