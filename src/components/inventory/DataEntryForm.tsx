"use client"

import { useState } from "react"
import { addInventoryItem } from "@/actions/inventory"
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

export function DataEntryForm() {
  const [loading, setLoading] = useState(false)
  const [generatedBarcode, setGeneratedBarcode] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const serialNumber = formData.get("serialNumber") as string

    try {
      await addInventoryItem({
        serialNumber,
        lotNumber: (formData.get("lotNumber") as string) || undefined,
        modelName: formData.get("modelName") as string,
        processor: formData.get("processor") as string,
        gpu: formData.get("gpu") as string,
        ram: formData.get("ram") as string,
        storage: formData.get("storage") as string,
        purchaseCost: parseFloat(formData.get("purchaseCost") as string),
        retailPrice: parseFloat(formData.get("retailPrice") as string),
      })
      toast.success("Item saved — pending admin approval", {
        description: "It won't be sellable at the POS until a Super Admin approves it.",
      })
      setGeneratedBarcode(serialNumber)
      e.currentTarget.reset()
    } catch {
      toast.error(
        "Failed to save item — does this serial number already exist?"
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
      title: generatedBarcode ?? "Barcode Label",
    })
  }

  if (generatedBarcode) {
    return (
      <Card className="max-w-md mx-auto mt-12 text-center">
        <CardHeader>
          <CardTitle>Print Barcode Label</CardTitle>
          <CardDescription>
            Item saved. Print the sticker and attach it to the laptop.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-2 border-dashed border-gray-200 p-8 rounded-xl bg-white inline-block">
            <Barcode value={generatedBarcode} width={2} height={60} fontSize={14} />
          </div>
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => setGeneratedBarcode(null)}
            >
              Done
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-primary text-primary-foreground"
            >
              <Printer className="w-4 h-4 mr-2" /> Print Sticker
            </Button>
          </div>
        </CardContent>

        {/* 50 × 25 mm barcode sticker — print-only */}
        <div className="barcode-sticker-container hidden w-[50mm] h-[25mm] flex-col items-center justify-center bg-white text-black p-1">
          <Barcode
            value={generatedBarcode}
            width={1.15}
            height={28}
            fontSize={9}
            margin={0}
          />
        </div>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle className="text-2xl">Receive New Stock</CardTitle>
        <CardDescription>
          Enter the specifications of the physical laptop being received.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="serialNumber" className="font-semibold text-gray-700">
              Serial Number (scan or type)
            </Label>
            <Input
              id="serialNumber"
              name="serialNumber"
              placeholder="e.g. SN-982374"
              required
              className="text-lg py-6 font-mono bg-gray-50 border-gray-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lotNumber" className="font-semibold text-gray-700">
              Lot / Accounting Ref. No. (optional)
            </Label>
            <Input
              id="lotNumber"
              name="lotNumber"
              placeholder="e.g. the batch/invoice code from your accounting software"
              className="font-mono bg-gray-50 border-gray-300"
            />
            <p className="text-xs text-gray-400">
              Enter the same code this purchase batch uses in your accounting software, so entries can be matched and filtered later.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="modelName" className="font-semibold text-gray-700">
                Model Name
              </Label>
              <Input
                id="modelName"
                name="modelName"
                placeholder="e.g. Dell Latitude 5420"
                required
                className="bg-gray-50 border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="processor" className="font-semibold text-gray-700">
                Processor (CPU)
              </Label>
              <Input
                id="processor"
                name="processor"
                placeholder="e.g. Intel Core i5 11th Gen"
                required
                className="bg-gray-50 border-gray-300"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="gpu" className="font-semibold text-gray-700">
                GPU / Graphics
              </Label>
              <Input
                id="gpu"
                name="gpu"
                placeholder="e.g. NVIDIA RTX 3050 Ti  or  Intel Iris Xe (Integrated)"
                required
                className="bg-gray-50 border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ram" className="font-semibold text-gray-700">
                Installed RAM
              </Label>
              <Input
                id="ram"
                name="ram"
                placeholder="e.g. 16GB DDR4"
                required
                className="bg-gray-50 border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storage" className="font-semibold text-gray-700">
                Installed Storage
              </Label>
              <Input
                id="storage"
                name="storage"
                placeholder="e.g. 512GB NVMe SSD"
                required
                className="bg-gray-50 border-gray-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
            <div className="space-y-2">
              <Label htmlFor="purchaseCost" className="font-semibold text-gray-700">
                Purchase Cost (RM)
              </Label>
              <Input
                id="purchaseCost"
                name="purchaseCost"
                type="number"
                min="0"
                step="0.01"
                required
                className="bg-gray-50 border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retailPrice" className="font-semibold text-gray-700">
                Target Retail Price (RM)
              </Label>
              <Input
                id="retailPrice"
                name="retailPrice"
                type="number"
                min="0"
                step="0.01"
                required
                className="bg-gray-50 border-gray-300"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full text-lg h-14 bg-primary text-white hover:bg-primary/90 shadow-sm"
          >
            {loading ? "Saving…" : "Save Item & Generate Barcode Label"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
