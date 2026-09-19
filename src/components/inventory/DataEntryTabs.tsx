"use client"

import { useState } from "react"
import { DataEntryForm } from "@/components/inventory/DataEntryForm"
import { BulkUploadPanel } from "@/components/inventory/BulkUploadPanel"
import { cn } from "@/lib/utils"
import { FileText, FileSpreadsheet } from "lucide-react"
import { PageHelp } from "@/components/layout/PageHelp"

type Tab = "single" | "bulk"

export function DataEntryTabs() {
  const [tab, setTab] = useState<Tab>("single")

  return (
    <div>
      <div className="max-w-2xl mx-auto mb-4 flex items-center justify-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Receive Stock</h1>
        <PageHelp title="Receive Stock">
          <p>Where new laptops enter the system — nothing is sellable until it&apos;s added here.</p>
          <ul>
            <li><strong>Single Item</strong> — enter one laptop&apos;s full spec by hand (model, CPU, GPU, RAM, storage, serial, cost, retail price).</li>
            <li><strong>Bulk Upload (Excel)</strong> — add many at once from a spreadsheet; download the template first to see the expected columns.</li>
            <li>New items start as <strong>Pending Approval</strong> — a SUPER_ADMIN has to approve them on the Inventory Ledger page before they can be sold at the POS.</li>
          </ul>
        </PageHelp>
      </div>
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

      {tab === "single" ? <DataEntryForm /> : <BulkUploadPanel />}
    </div>
  )
}
