"use client"

import { useState } from "react"
import { AddAccessoryForm } from "@/components/accessories/AddAccessoryForm"
import { AccessoryBulkUploadPanel } from "@/components/accessories/AccessoryBulkUploadPanel"
import { cn } from "@/lib/utils"
import { FileText, FileSpreadsheet } from "lucide-react"

type Tab = "single" | "bulk"

export function AccessoriesTabs() {
  const [tab, setTab] = useState<Tab>("single")

  return (
    <div>
      <div className="max-w-2xl mx-auto mb-6 flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {(
          [
            { id: "single", label: "Single Item", icon: FileText },
            { id: "bulk", label: "Bulk Upload (Excel)", icon: FileSpreadsheet },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
              tab === id
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "single" ? <AddAccessoryForm /> : <AccessoryBulkUploadPanel />}
    </div>
  )
}
