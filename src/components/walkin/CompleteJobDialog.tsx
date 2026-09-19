"use client"

import { useState } from "react"
import { completeWalkInJob } from "@/actions/walkin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/money"
import { toast } from "sonner"

type Job = { id: string; customerName: string; deviceDescription: string; estimatedCost: number } | null

export function CompleteJobDialog({ job, onClose, onCompleted }: { job: Job; onClose: () => void; onCompleted: () => void }) {
  const [actualCost, setActualCost] = useState("")
  const [shopCost, setShopCost] = useState("")
  const [loading, setLoading] = useState(false)

  const actual = parseFloat(actualCost)
  const shop = parseFloat(shopCost)
  const balance = job && Number.isFinite(actual) ? actual - job.estimatedCost : null
  const profit = Number.isFinite(actual) && Number.isFinite(shop) ? actual - shop : null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!job) return
    if (!Number.isFinite(actual) || actual < 0 || !Number.isFinite(shop) || shop < 0) {
      toast.error("Enter valid amounts for both fields")
      return
    }
    setLoading(true)
    try {
      await completeWalkInJob({ jobId: job.id, actualCost: actual, shopCost: shop })
      toast.success("Job completed", { description: job.customerName })
      setActualCost("")
      setShopCost("")
      onCompleted()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to complete job")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!job} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Complete Job</DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            {job?.customerName} — {job?.deviceDescription}
            {job && <><br />Estimate given: {formatCurrency(job.estimatedCost)}</>}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-2">
            <Label htmlFor="actualCost">Final Bill — Amount Charged (RM)</Label>
            <Input id="actualCost" type="number" min="0" step="0.01" value={actualCost} onChange={(e) => setActualCost(e.target.value)} required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shopCost">Shop Cost — Parts/Labor (RM)</Label>
            <Input id="shopCost" type="number" min="0" step="0.01" value={shopCost} onChange={(e) => setShopCost(e.target.value)} required />
          </div>
          {(balance !== null || profit !== null) && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1 text-sm">
              {balance !== null && (
                <div className="flex justify-between">
                  <span className="text-slate-500">{balance >= 0 ? "Balance due from customer" : "Credit owed to customer"}</span>
                  <span className={balance >= 0 ? "font-bold text-slate-900" : "font-bold text-emerald-600"}>
                    {formatCurrency(Math.abs(balance))}
                  </span>
                </div>
              )}
              {profit !== null && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Profit on this job</span>
                  <span className={profit >= 0 ? "font-bold text-emerald-600" : "font-bold text-red-600"}>
                    {formatCurrency(profit)}
                  </span>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Saving..." : "Confirm Completion"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
