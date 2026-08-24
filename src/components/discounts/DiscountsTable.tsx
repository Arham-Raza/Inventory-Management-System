"use client"

import { useMemo, useState } from "react"
import { ToggleDiscountButton } from "@/components/discounts/ToggleDiscountButton"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/money"
import { Search } from "lucide-react"

type Campaign = {
  id: string
  name: string
  type: string
  value: number
  isActive: boolean
  redemptions: number
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "All campaigns" },
  { value: "ACTIVE", label: "Active only" },
  { value: "INACTIVE", label: "Inactive only" },
]

export function DiscountsTable({ campaigns }: { campaigns: Campaign[] }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return campaigns.filter((c) => {
      if (statusFilter === "ACTIVE" && !c.isActive) return false
      if (statusFilter === "INACTIVE" && c.isActive) return false
      if (!q) return true
      return c.name.toLowerCase().includes(q)
    })
  }, [campaigns, search, statusFilter])

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 px-6 pb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search campaign name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "ALL")}>
          <SelectTrigger className="w-full sm:w-48 bg-white border-slate-200">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-400 self-center sm:ml-auto">
          {filtered.length} of {campaigns.length} campaigns
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-slate-100">
            <TableHead className="pl-6 text-xs">Campaign Name</TableHead>
            <TableHead className="text-xs">Type</TableHead>
            <TableHead className="text-xs">Value</TableHead>
            <TableHead className="text-xs">Redemptions</TableHead>
            <TableHead className="text-xs text-right pr-6">Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                {campaigns.length === 0
                  ? 'No discount campaigns yet. Click "New Promotion" to create one.'
                  : "No campaigns match your search / filter."}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((campaign) => (
              <TableRow key={campaign.id} className="border-slate-100 hover:bg-slate-50/50">
                <TableCell className="pl-6 font-semibold text-sm text-slate-900">
                  {campaign.name}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      campaign.type === "PERCENTAGE"
                        ? "bg-violet-50 text-violet-700 border border-violet-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {campaign.type === "PERCENTAGE" ? "% Percentage" : "RM Fixed"}
                  </span>
                </TableCell>
                <TableCell className="font-bold text-slate-900">
                  {campaign.type === "PERCENTAGE" ? `${campaign.value}%` : formatCurrency(campaign.value)}
                </TableCell>
                <TableCell className="text-sm text-slate-500">{campaign.redemptions}</TableCell>
                <TableCell className="text-right pr-6">
                  <ToggleDiscountButton id={campaign.id} isActive={campaign.isActive} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  )
}
