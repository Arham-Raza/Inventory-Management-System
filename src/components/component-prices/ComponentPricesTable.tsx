"use client"

import { useState } from "react"
import { deleteComponentPrice } from "@/actions/componentPrices"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/money"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

type ComponentPrice = {
  id: string
  type: "RAM" | "STORAGE"
  label: string
  price: number
}

export function ComponentPricesTable({ prices }: { prices: ComponentPrice[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteComponentPrice(id)
      toast.success("Component price removed")
    } catch {
      toast.error("Failed to remove component price")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-slate-100">
          <TableHead className="pl-6 text-xs">Type</TableHead>
          <TableHead className="text-xs">Label</TableHead>
          <TableHead className="text-xs">Price</TableHead>
          <TableHead className="text-xs text-right pr-6"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {prices.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-12 text-slate-400">
              No component prices set yet. Click &quot;Add Price&quot; to create one.
            </TableCell>
          </TableRow>
        ) : (
          prices.map((p) => (
            <TableRow key={p.id} className="border-slate-100 hover:bg-slate-50/50">
              <TableCell className="pl-6">
                <span
                  className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    p.type === "RAM"
                      ? "bg-violet-50 text-violet-700 border border-violet-200"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}
                >
                  {p.type}
                </span>
              </TableCell>
              <TableCell className="font-mono text-sm text-slate-900">{p.label}</TableCell>
              <TableCell className="font-bold text-slate-900">{formatCurrency(p.price)}</TableCell>
              <TableCell className="text-right pr-6">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={deletingId === p.id}
                  onClick={() => handleDelete(p.id)}
                  aria-label={`Delete ${p.label} price`}
                >
                  <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
