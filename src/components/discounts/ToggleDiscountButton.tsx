"use client"

import { useState } from "react"
import { toggleDiscountCampaign } from "@/actions/discounts"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

export function ToggleDiscountButton({ id, isActive }: { id: string, isActive: boolean }) {
  const [loading, setLoading] = useState(false)

  const handleToggle = async (checked: boolean) => {
    setLoading(true)
    try {
      await toggleDiscountCampaign(id, checked)
      toast.success(`Campaign ${checked ? 'activated' : 'deactivated'}`)
    } catch (error) {
      toast.error("Failed to update campaign")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Switch 
      checked={isActive} 
      onCheckedChange={handleToggle} 
      disabled={loading} 
    />
  )
}
