"use client"

import { useState } from "react"
import { returnFromRepair } from "@/actions/repair"
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
import { toast } from "sonner"

export function ReturnFromRepairDialog({
  dispatch,
  onClose,
  onReturned,
}: {
  dispatch: { id: string; modelName: string; serialNumber: string } | null
  onClose: () => void
  onReturned: () => void
}) {
  const [cost, setCost] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!dispatch) return
    const value = parseFloat(cost)
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter a valid repair cost")
      return
    }
    setLoading(true)
    try {
      await returnFromRepair({ dispatchId: dispatch.id, cost: value })
      toast.success("Marked as returned", { description: `${dispatch.modelName} is back in stock.` })
      setCost("")
      onReturned()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark as returned")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!dispatch} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Mark Returned</DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            {dispatch?.modelName} · {dispatch?.serialNumber}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="cost">Repair Cost (RM)</Label>
            <Input
              id="cost"
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="e.g. 400"
              autoFocus
              required
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Saving..." : "Confirm Return"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
