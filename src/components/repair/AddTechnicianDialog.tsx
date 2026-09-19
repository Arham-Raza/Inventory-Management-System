"use client"

import { useState } from "react"
import { createTechnician } from "@/actions/repair"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { UserPlus } from "lucide-react"

export function AddTechnicianDialog({
  onCreated,
}: {
  onCreated: (technician: { id: string; name: string; phone: string | null; specialty: string | null }) => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      const technician = await createTechnician({
        name: formData.get("name") as string,
        phone: (formData.get("phone") as string) || undefined,
        specialty: (formData.get("specialty") as string) || undefined,
      })
      onCreated(technician)
      toast.success("Technician added")
      setOpen(false)
      e.currentTarget.reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add technician")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* @ts-expect-error Radix React 19 type issue */}
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <UserPlus className="w-3.5 h-3.5 mr-1.5" /> New Technician
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Add Technician</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" name="phone" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialty">Specialty (optional)</Label>
            <Input id="specialty" name="specialty" placeholder="e.g. Screen repair" />
          </div>
          <DialogFooter className="pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
