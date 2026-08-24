"use client"

import { useMemo, useState } from "react"
import type { getAccountingStats } from "@/actions/accounting"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search } from "lucide-react"

type Transaction = Awaited<ReturnType<typeof getAccountingStats>>["transactions"][number]

export function AccountingTable({ transactions }: { transactions: Transaction[] }) {
  const [search, setSearch] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const fromDate = from ? new Date(from) : null
    const toDate = to ? new Date(to) : null

    return transactions.filter((tx) => {
      if (fromDate && tx.date < fromDate) return false
      if (toDate) {
        const endOfDay = new Date(toDate)
        endOfDay.setHours(23, 59, 59, 999)
        if (tx.date > endOfDay) return false
      }
      if (!q) return true
      return (
        tx.id.toLowerCase().includes(q) ||
        tx.serialNumbers.some((s) => s.toLowerCase().includes(q)) ||
        tx.lotNumbers.some((l) => l.toLowerCase().includes(q))
      )
    })
  }, [transactions, search, from, to])

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 pb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search order, serial, or lot / ref #…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-40"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-40"
          />
        </div>
        <p className="text-xs text-muted-foreground self-center sm:ml-auto">
          {filtered.length} of {transactions.length} transactions
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Serial / Lot #</TableHead>
            <TableHead>Discount</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">COGS</TableHead>
            <TableHead className="text-right">Profit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                {transactions.length === 0
                  ? "No transactions recorded yet."
                  : "No transactions match your search / filter."}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="font-mono text-xs">{tx.id.split("-")[0]}</TableCell>
                <TableCell>{tx.date.toLocaleDateString()}</TableCell>
                <TableCell>{tx.itemsCount}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground max-w-52 truncate">
                  {tx.lotNumbers.length > 0
                    ? tx.lotNumbers.join(", ")
                    : tx.serialNumbers.join(", ") || "—"}
                </TableCell>
                <TableCell>
                  {tx.manualDiscount ? (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 cursor-help"
                      title={`Authorized by ${tx.manualDiscount.authorizedBy} — ${tx.manualDiscount.reason}`}
                    >
                      Manager Override
                    </span>
                  ) : tx.discountName ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      {tx.discountName}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  RM {tx.revenue.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-destructive text-sm">
                  RM {tx.cogs.toLocaleString()}
                </TableCell>
                <TableCell
                  className={`text-right font-bold ${
                    tx.profit >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  RM {tx.profit.toLocaleString()}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  )
}
