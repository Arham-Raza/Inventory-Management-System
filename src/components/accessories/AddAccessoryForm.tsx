"use client"

import { useState } from "react"
import { addAccessory } from "@/actions/accessories"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { toast } from "sonner"
import Barcode from "react-barcode"
import { Printer } from "lucide-react"
import { printElementAtSize } from "@/lib/print"

export function AddAccessoryForm() {
  const [loading, setLoading] = useState(false)
  const [savedBarcode, setSavedBarcode] = useState<string | null>(null)
  const [savedName, setSavedName] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const barcode = (formData.get("barcode") as string) || undefined

    try {
      const result = await addAccessory({
        name,
        quantity: parseInt(formData.get("quantity") as string, 10),
        sellingPrice: parseFloat(formData.get("sellingPrice") as string),
        costPrice: formData.get("costPrice")
          ? parseFloat(formData.get("costPrice") as string)
          : undefined,
        barcode,
      })
      toast.success("Accessory saved", {
        description: barcode
          ? "Existing barcode kept as-is."
          : `Generated barcode ${result.barcode} — print a label for it.`,
      })
      setSavedBarcode(result.barcode)
      setSavedName(result.name)
      e.currentTarget.reset()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save item — does this barcode already exist?"
      )
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    const label = document.querySelector<HTMLElement>(".barcode-sticker-container")
    if (!label) {
      toast.error("Barcode label is not ready yet")
      return
    }
    printElementAtSize(label, "50mm 25mm", {
      bodyClass: "print-barcode-label",
      title: savedBarcode ?? "Barcode Label",
    })
  }

  if (savedBarcode) {
    return (
      <Card className="max-w-md mx-auto mt-12 text-center">
        <CardHeader>
          <CardTitle>Print Barcode Label</CardTitle>
          <CardDescription>
            {savedName} saved. Print the sticker and attach it to the item.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-2 border-dashed border-gray-200 p-8 rounded-xl bg-white inline-block">
            <Barcode value={savedBarcode} width={2} height={60} fontSize={14} />
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => setSavedBarcode(null)}>
              Done
            </Button>
            <Button onClick={handlePrint} className="bg-primary text-primary-foreground">
              <Printer className="w-4 h-4 mr-2" /> Print Sticker
            </Button>
          </div>
        </CardContent>

        {/* 50 × 25 mm barcode sticker — print-only */}
        <div className="barcode-sticker-container hidden w-[50mm] h-[25mm] flex-col items-center justify-center bg-white text-black p-1">
          <Barcode value={savedBarcode} width={1.15} height={28} fontSize={9} margin={0} />
        </div>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle className="text-2xl">Add Accessory</CardTitle>
        <CardDescription>
          Non-serialized stock — chargers, cables, cases, etc. — tracked by running quantity, not a per-unit serial.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-semibold text-gray-700">
              Name / Description
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. REMAX RP-U22 Charger 2.4A Black"
              required
              className="bg-gray-50 border-gray-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode" className="font-semibold text-gray-700">
              Barcode (optional)
            </Label>
            <Input
              id="barcode"
              name="barcode"
              placeholder="Scan an existing barcode, or leave blank to auto-generate"
              className="font-mono bg-gray-50 border-gray-300"
            />
            <p className="text-xs text-gray-400">
              Leave blank if this item has no printed barcode yet — one will be generated (e.g. ACC-000123) so you can print a sticker for it.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="quantity" className="font-semibold text-gray-700">
                Quantity in Stock
              </Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                step="1"
                defaultValue="0"
                required
                className="bg-gray-50 border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellingPrice" className="font-semibold text-gray-700">
                Selling Price (RM)
              </Label>
              <Input
                id="sellingPrice"
                name="sellingPrice"
                type="number"
                min="0"
                step="0.01"
                required
                className="bg-gray-50 border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPrice" className="font-semibold text-gray-700">
                Cost Price (RM, optional)
              </Label>
              <Input
                id="costPrice"
                name="costPrice"
                type="number"
                min="0"
                step="0.01"
                className="bg-gray-50 border-gray-300"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full text-lg h-14 bg-primary text-white hover:bg-primary/90 shadow-sm"
          >
            {loading ? "Saving…" : "Save Accessory"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
