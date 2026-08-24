import { getDashboardStats } from "@/actions/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  TrendingUp,
  ShoppingBag,
  Package,
  BarChart3,
  ArrowUpRight,
  Clock,
} from "lucide-react"
import { formatCurrency } from "@/lib/money"
import { auth } from "@/auth"

export default async function DashboardPage() {
  const [stats, session] = await Promise.all([getDashboardStats(), auth()])

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const stockUtilisationPct =
    stats.totalItems > 0
      ? Math.round(
          ((stats.totalItems - stats.availableStock) / stats.totalItems) * 100
        )
      : 0

  return (
    <div className="space-y-8">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {greeting}, {session?.user?.name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="text-slate-500 mt-1">
            {new Date().toLocaleDateString("en-MY", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-700 px-3 py-2 rounded-full font-medium border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          System Online
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500">
              Today&apos;s Revenue
            </CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(stats.todayRevenue)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {stats.todayOrders} transaction
              {stats.todayOrders !== 1 ? "s" : ""} today
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500">
              Lifetime Revenue
            </CardTitle>
            <div className="p-2 bg-violet-50 rounded-lg">
              <BarChart3 className="h-4 w-4 text-violet-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(stats.lifetimeRevenue)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {stats.lifetimeOrders} total orders
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500">
              Available Stock
            </CardTitle>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Package className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {stats.availableStock}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              of {stats.totalItems} total units
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500">
              Stock Sold
            </CardTitle>
            <div className="p-2 bg-amber-50 rounded-lg">
              <ShoppingBag className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {stockUtilisationPct}%
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {stats.totalItems - stats.availableStock} of {stats.totalItems}{" "}
              units cleared
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Recent transactions ── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Recent Transactions
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Last {stats.recentOrders.length} completed orders
            </p>
          </div>
          <Clock className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="pl-6 text-xs">Order ID</TableHead>
                <TableHead className="text-xs">Cashier</TableHead>
                <TableHead className="text-xs">Items</TableHead>
                <TableHead className="text-xs">Promo</TableHead>
                <TableHead className="text-xs">Time</TableHead>
                <TableHead className="text-xs text-right pr-6">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentOrders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-slate-400"
                  >
                    No transactions recorded yet. Launch the POS to make your
                    first sale.
                  </TableCell>
                </TableRow>
              ) : (
                stats.recentOrders.map((tx) => (
                  <TableRow
                    key={tx.id}
                    className="border-slate-100 hover:bg-slate-50/50"
                  >
                    <TableCell className="pl-6 font-mono text-xs font-bold text-slate-700">
                      #{tx.id.slice(-8).toUpperCase()}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {tx.cashierName}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {tx.itemCount} unit{tx.itemCount !== 1 ? "s" : ""}
                    </TableCell>
                    <TableCell>
                      {tx.discountName ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                          {tx.discountName}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {tx.createdAt.toLocaleTimeString("en-MY", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-right pr-6 font-bold text-slate-900">
                      <span className="flex items-center justify-end gap-1">
                        {formatCurrency(tx.total)}
                        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
