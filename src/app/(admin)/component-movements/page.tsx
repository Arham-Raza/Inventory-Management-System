import { getComponentMovements } from "@/actions/componentMovements"
import { ComponentMovementsReport } from "@/components/component-movements/ComponentMovementsReport"
import { PageHelp } from "@/components/layout/PageHelp"

function isoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default async function ComponentMovementsPage() {
  const to = new Date()
  to.setHours(23, 59, 59, 999)
  const from = new Date()
  from.setDate(from.getDate() - 6)
  from.setHours(0, 0, 0, 0)

  const initialReport = await getComponentMovements(from.toISOString(), to.toISOString())

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Component Movements
          </h1>
          <PageHelp title="Component Movements">
            <p>
              A read-only report built on top of the Component Prices list —
              it doesn&apos;t do anything itself, it just surfaces what
              happened at checkout.
            </p>
            <ul>
              <li>Whenever a cashier confirms different RAM/storage than what a laptop was stocked in with, that&apos;s a &quot;swap&quot;, logged here.</li>
              <li><strong>Accounted</strong> — the removed part had a price and was routed to spare-parts stock (in Accessories, prefixed SPARE-).</li>
              <li><strong>Unaccounted</strong> — the swap happened but there was no price-list entry for the removed part, so nothing could be valued or tracked. Add a price for it under Component Prices to fix this going forward.</li>
              <li>The &quot;Swaps by Staff&quot; breakdown is for accountability — who processed which swap.</li>
            </ul>
          </PageHelp>
        </div>
        <p className="text-slate-500 mt-1">
          Every RAM/storage swap between stock-in and sale, for staff accountability.
        </p>
      </div>

      <ComponentMovementsReport
        initialReport={initialReport}
        defaultFrom={isoDateOnly(from)}
        defaultTo={isoDateOnly(to)}
      />
    </div>
  )
}
