import { getInventoryStats, getAllInventory } from "@/actions/inventory"
import { InventoryTable } from "@/components/inventory/InventoryTable"
import { auth } from "@/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Hash, Wallet, Clock } from "lucide-react"
import { formatCurrency } from "@/lib/money"

export default async function InventoryPage() {
  const [stats, items, session] = await Promise.all([
    getInventoryStats(),
    getAllInventory(),
    auth(),
  ])
  const canApprove = session?.user?.role === "SUPER_ADMIN"

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Inventory Ledger
        </h1>
        <p className="text-slate-500 mt-1">
          Every physical unit tracked by serial number.
        </p>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Units
            </CardTitle>
            <div className="p-2 bg-slate-100 rounded-lg">
              <Hash className="h-4 w-4 text-slate-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {stats.totalItems}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              All statuses combined
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Available to Sell
            </CardTitle>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Package className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">
              {stats.availableItems}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Ready at the POS terminal
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Pending Approval
            </CardTitle>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-600">
              {stats.pendingApproval}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Awaiting Super Admin review
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Inventory Value (Cost)
            </CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {formatCurrency(stats.totalValue)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Available stock at purchase cost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Full inventory table ── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-slate-900">
            All Physical Stock
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <InventoryTable items={items} canApprove={canApprove} />
        </CardContent>
      </Card>
    </div>
  )
}
