import { getAccessoryStats, getAllAccessories } from "@/actions/accessories"
import { AccessoriesPageClient } from "@/components/accessories/AccessoriesPageClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Boxes, Layers, Wallet, PackageX } from "lucide-react"
import { formatCurrency } from "@/lib/money"
import { PageHelp } from "@/components/layout/PageHelp"

export default async function AccessoriesPage() {
  const [stats, items] = await Promise.all([getAccessoryStats(), getAllAccessories()])

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Accessories
          </h1>
          <PageHelp title="Accessories">
            <p>
              Non-serialized stock — chargers, cables, cases, and small
              parts — tracked as a running quantity per SKU rather than one
              row per physical item like laptops.
            </p>
            <ul>
              <li>Add one item at a time, or <strong>bulk upload a spreadsheet</strong> of many at once.</li>
              <li>Use the +/- steppers to adjust stock quantity directly.</li>
              <li>Select several rows to <strong>print all their barcode labels in one job</strong>.</li>
              <li>Sold at the POS by scanning the barcode — quantity decrements automatically at checkout.</li>
              <li>Reclaimed RAM/SSD sticks from Module B&apos;s component swaps also land here, prefixed <strong>SPARE-</strong>.</li>
            </ul>
          </PageHelp>
        </div>
        <p className="text-slate-500 mt-1">
          Non-serialized stock — chargers, cables, cases — tracked by quantity, not serial number.
        </p>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total SKUs
            </CardTitle>
            <div className="p-2 bg-slate-100 rounded-lg">
              <Layers className="h-4 w-4 text-slate-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{stats.totalSkus}</div>
            <p className="text-xs text-slate-400 mt-1">Distinct products tracked</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Units in Stock
            </CardTitle>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Boxes className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">{stats.totalUnits}</div>
            <p className="text-xs text-slate-400 mt-1">Across all SKUs</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Out of Stock
            </CardTitle>
            <div className="p-2 bg-rose-50 rounded-lg">
              <PackageX className="h-4 w-4 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-600">{stats.outOfStock}</div>
            <p className="text-xs text-slate-400 mt-1">SKUs at zero quantity</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Stock Value (Retail)
            </CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {formatCurrency(stats.totalStockValue)}
            </div>
            <p className="text-xs text-slate-400 mt-1">Quantity × selling price</p>
          </CardContent>
        </Card>
      </div>

      <AccessoriesPageClient items={items} />
    </div>
  )
}
