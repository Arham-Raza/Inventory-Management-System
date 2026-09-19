"use client"

import { useState } from "react"
import { upsertComponentPrice } from "@/actions/componentPrices"
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
import { Plus } from "lucide-react"

export function AddComponentPriceDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<"RAM" | "STORAGE">("RAM")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      type,
      label: formData.get("label") as string,
      price: parseFloat(formData.get("price") as string),
    }

    try {
      await upsertComponentPrice(data)
      toast.success("Component price saved")
      setOpen(false)
      e.currentTarget.reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save component price")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* @ts-expect-error Radix React 19 type issue */}
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> Add Price</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Component Price</DialogTitle>
          <DialogDescription>
            The label must exactly match how RAM/storage is entered elsewhere
            in the system (e.g. &quot;16GB DDR4&quot;) — saving an existing
            label updates its price.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType((v as "RAM" | "STORAGE") ?? "RAM")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RAM">RAM</SelectItem>
                  <SelectItem value="STORAGE">Storage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price (RM)</Label>
              <Input id="price" name="price" type="number" min="0" step="0.01" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input id="label" name="label" placeholder="e.g. 16GB DDR4" required />
          </div>
          <DialogFooter className="pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
