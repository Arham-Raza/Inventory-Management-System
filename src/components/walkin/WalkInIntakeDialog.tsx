"use client"

import { useState } from "react"
import { createWalkInJob } from "@/actions/walkin"
import { WalkInJobLabel } from "./WalkInJobLabel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { printElementAtSize } from "@/lib/print"
import { Plus, Printer } from "lucide-react"

type Technician = { id: string; name: string }
type CreatedJob = Awaited<ReturnType<typeof createWalkInJob>>

export function WalkInIntakeDialog({
  technicians,
  onCreated,
}: {
  technicians: Technician[]
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [jobType, setJobType] = useState<"REPAIR" | "UPGRADE" | "SERVICE">("REPAIR")
  const [technicianId, setTechnicianId] = useState<string>("none")
  const [createdJob, setCreatedJob] = useState<CreatedJob | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      const job = await createWalkInJob({
        jobType,
        customerName: formData.get("customerName") as string,
        customerPhone: (formData.get("customerPhone") as string) || undefined,
        deviceDescription: formData.get("deviceDescription") as string,
        issueDescription: formData.get("issueDescription") as string,
        estimatedCost: parseFloat(formData.get("estimatedCost") as string),
        technicianId: technicianId !== "none" ? technicianId : undefined,
      })
      setCreatedJob(job)
      onCreated()
      toast.success("Job created", { description: `Barcode ${job.barcode}` })
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create job")
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    const label = document.querySelector<HTMLElement>(".walkin-label-container")
    if (!label || !createdJob) {
      toast.error("Label is not ready yet")
      return
    }
    printElementAtSize(label, "50mm 25mm", {
      bodyClass: "print-barcode-label",
      title: createdJob.barcode,
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* @ts-expect-error Radix React 19 type issue */}
        <DialogTrigger asChild>
          <Button>
            <Plus className="w-4 h-4 mr-2" /> New Walk-in Job
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>New Walk-in Job</DialogTitle>
            <p className="text-sm text-slate-500 mt-1">
              For a device we didn&apos;t sell — tracked separately from our own inventory.
            </p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Job Type</Label>
                <Select value={jobType} onValueChange={(v) => setJobType((v as typeof jobType) ?? "REPAIR")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REPAIR">Repair</SelectItem>
                    <SelectItem value="UPGRADE">Upgrade</SelectItem>
                    <SelectItem value="SERVICE">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="estimatedCost">Estimated Cost (RM)</Label>
                <Input id="estimatedCost" name="estimatedCost" type="number" min="0" step="0.01" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input id="customerName" name="customerName" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customerPhone">Phone (optional)</Label>
                <Input id="customerPhone" name="customerPhone" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deviceDescription">Device</Label>
              <Input id="deviceDescription" name="deviceDescription" placeholder="e.g. HP Pavilion 15, black" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issueDescription">Issue</Label>
              <Textarea id="issueDescription" name="issueDescription" rows={2} placeholder="What's wrong with it?" required />
            </div>
            <div className="space-y-1.5">
              <Label>Technician (optional)</Label>
              <Select value={technicianId} onValueChange={(v) => setTechnicianId(v ?? "none")}>
                <SelectTrigger><SelectValue placeholder="In-house / unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">In-house / unassigned</SelectItem>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Job & Print Label"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Label print dialog, shown right after intake ── */}
      <Dialog open={!!createdJob} onOpenChange={(open) => !open && setCreatedJob(null)}>
        <DialogContent className="sm:max-w-[380px] text-center">
          <DialogHeader>
            <DialogTitle>Print Walk-in Label</DialogTitle>
          </DialogHeader>
          {createdJob && (
            <>
              <p className="text-sm text-slate-500 -mt-2">{createdJob.customerName} — {createdJob.deviceDescription}</p>
              <div className="border-2 border-dashed border-gray-200 p-6 rounded-xl bg-white inline-block mx-auto">
                <div className="bg-black text-white text-[10px] font-bold text-center tracking-widest py-1 mb-2 rounded-t">
                  WALK-IN — {createdJob.jobType}
                </div>
                <p className="font-mono text-sm">{createdJob.barcode}</p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <Button variant="outline" onClick={() => setCreatedJob(null)}>Close</Button>
                <Button onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" /> Print Sticker
                </Button>
              </div>
              <WalkInJobLabel barcode={createdJob.barcode} jobType={createdJob.jobType} customerName={createdJob.customerName} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
