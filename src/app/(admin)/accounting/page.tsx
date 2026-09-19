import { getAccountingStats } from "@/actions/accounting"
import { AccountingTable } from "@/components/accounting/AccountingTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, TrendingDown, Percent } from "lucide-react"
import { PageHelp } from "@/components/layout/PageHelp"

export default async function AccountingPage() {
  const stats = await getAccountingStats()

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Accounting &amp; Profitability</h1>
          <PageHelp title="Accounting & Profitability">
            <p>SUPER_ADMIN only — a read-only financial view across every completed sale.</p>
            <ul>
              <li><strong>Revenue</strong> — total of what customers paid (after discounts, including tax).</li>
              <li><strong>COGS</strong> — total purchase cost of the stock that was sold.</li>
              <li><strong>Gross Profit</strong> — Revenue minus COGS; <strong>Margin</strong> is that as a percentage.</li>
              <li>This doesn&apos;t yet include Repair Dispatch or Walk-in Repair spend/profit — those have their own ledgers on their respective pages.</li>
            </ul>
          </PageHelp>
        </div>
        <p className="text-muted-foreground">Track revenue, cost of goods sold (COGS), and gross profit margins.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">RM {stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total COGS</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">RM {stats.totalCogs.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total cost of purchased stock sold</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">RM {stats.grossProfit.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.profitMarginPercent.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Average margin across all sales</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountingTable transactions={stats.transactions} />
        </CardContent>
      </Card>
    </div>
  )
}
