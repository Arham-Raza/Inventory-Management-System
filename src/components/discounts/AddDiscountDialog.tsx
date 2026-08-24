"use client"

import { useState } from "react"
import { createDiscountCampaign } from "@/actions/discounts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Tag } from "lucide-react"

export function AddDiscountDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState("PERCENTAGE")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name") as string,
      type: type,
      value: parseFloat(formData.get("value") as string),
    }

    try {
      await createDiscountCampaign(data)
      toast.success("Discount campaign created")
      setOpen(false)
    } catch (error) {
      toast.error("Failed to create discount campaign")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* @ts-expect-error Radix React 19 type issue */}
      <DialogTrigger asChild>
        <Button><Tag className="w-4 h-4 mr-2" /> New Promotion</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Discount Campaign</DialogTitle>
          <DialogDescription>
            Create a promotional code that cashiers can apply at checkout.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name</Label>
            <Input id="name" name="name" placeholder="e.g. SUMMER SALE" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select value={type} onValueChange={(v) => setType(v || "PERCENTAGE")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                  <SelectItem value="FIXED">Fixed Amount (RM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input id="value" name="value" type="number" min="0" step="0.01" required />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Campaign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
