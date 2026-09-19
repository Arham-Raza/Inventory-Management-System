"use client"

import { useState } from "react"
import { AccessoriesTable } from "@/components/accessories/AccessoriesTable"
import { AccessoriesTabs } from "@/components/accessories/AccessoriesTabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { List, PackagePlus } from "lucide-react"
import type { getAllAccessories } from "@/actions/accessories"

type Accessory = Awaited<ReturnType<typeof getAllAccessories>>[number]
type View = "ledger" | "add"

export function AccessoriesPageClient({ items }: { items: Accessory[] }) {
  const [view, setView] = useState<View>("ledger")

  return (
    <div className="space-y-6">
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {(
          [
            { id: "ledger", label: "Stock Ledger", icon: List },
            { id: "add", label: "Add / Import Stock", icon: PackagePlus },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
              view === id
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {view === "ledger" ? (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-slate-900">
              All Accessory Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AccessoriesTable items={items} />
          </CardContent>
        </Card>
      ) : (
        <div className="py-2">
          <AccessoriesTabs />
        </div>
      )}
    </div>
  )
}
