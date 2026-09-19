import { listComponentPrices } from "@/actions/componentPrices"
import { AddComponentPriceDialog } from "@/components/component-prices/AddComponentPriceDialog"
import { ComponentPricesTable } from "@/components/component-prices/ComponentPricesTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHelp } from "@/components/layout/PageHelp"

export default async function ComponentPricesPage() {
  const prices = await listComponentPrices()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Component Prices
            </h1>
            <PageHelp title="Component Prices">
              <p>
                A price list for RAM and storage capacities, used only by the
                component swap/auto-split logic at checkout — it has no other
                effect on the system.
              </p>
              <ul>
                <li>The <strong>label must exactly match</strong> how RAM/storage is typed elsewhere (e.g. on the Receive Stock form or at the POS spec-confirmation dialog) — &quot;16GB&quot; and &quot;16GB DDR4&quot; are treated as different entries.</li>
                <li>If a swap happens at checkout and there&apos;s no matching price here, the sale still goes through — the swap just can&apos;t be split or routed to spare-parts stock, and shows up as &quot;Unaccounted&quot; on Component Movements.</li>
                <li>Saving an existing label again updates its price rather than duplicating it.</li>
              </ul>
            </PageHelp>
          </div>
          <p className="text-slate-500 mt-1">
            Used to auto-split a laptop&apos;s sale price when the RAM/storage
            confirmed at checkout differs from what it was stocked in with.
          </p>
        </div>
        <AddComponentPriceDialog />
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-slate-900">
            Price List
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ComponentPricesTable prices={prices} />
        </CardContent>
      </Card>
    </div>
  )
}
