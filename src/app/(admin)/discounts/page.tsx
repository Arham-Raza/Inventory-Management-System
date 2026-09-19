import prisma from "@/lib/prisma"
import { AddDiscountDialog } from "@/components/discounts/AddDiscountDialog"
import { DiscountsTable } from "@/components/discounts/DiscountsTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tag, Percent, ToggleRight } from "lucide-react"
import { PageHelp } from "@/components/layout/PageHelp"

export default async function DiscountsPage() {
  const campaigns = await prisma.discountCampaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { orders: true } },
    },
  })

  const activeCount = campaigns.filter((c) => c.isActive).length
  const totalRedemptions = campaigns.reduce(
    (sum, c) => sum + c._count.orders,
    0
  )

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Discount Campaigns
            </h1>
            <PageHelp title="Discount Campaigns">
              <p>
                Promotions a cashier can apply at the POS checkout screen —
                only <strong>active</strong> campaigns show up there.
              </p>
              <ul>
                <li><strong>Percentage</strong> or <strong>Fixed Amount (RM)</strong> off the subtotal, before tax.</li>
                <li>Toggle a campaign active/inactive here — it disappears from the POS dropdown instantly when off, no need to delete it.</li>
                <li>A campaign is separate from a <strong>Manager Override</strong>, which a cashier can also request at checkout with a manager&apos;s credentials — the two can&apos;t be applied on the same order.</li>
                <li>Loyalty points redemption (from the customer&apos;s balance) stacks on top of whichever discount is applied here.</li>
              </ul>
            </PageHelp>
          </div>
          <p className="text-slate-500 mt-1">
            Manage promotions available to cashiers at checkout.
          </p>
        </div>
        <AddDiscountDialog />
      </div>

      {/* ── KPI cards ── */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Campaigns
            </CardTitle>
            <div className="p-2 bg-slate-100 rounded-lg">
              <Tag className="h-4 w-4 text-slate-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {campaigns.length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Active Promotions
            </CardTitle>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <ToggleRight className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">
              {activeCount}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Visible to cashiers right now
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Times Redeemed
            </CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Percent className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {totalRedemptions}
            </div>
            <p className="text-xs text-slate-400 mt-1">Across all campaigns</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Campaign table ── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-slate-900">
            Campaign List
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DiscountsTable
            campaigns={campaigns.map((c) => ({
              id: c.id,
              name: c.name,
              type: c.type,
              value: Number(c.value),
              isActive: c.isActive,
              redemptions: c._count.orders,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  )
}
