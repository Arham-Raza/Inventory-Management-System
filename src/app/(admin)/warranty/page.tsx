import { listActiveWarrantyClaims, getWarrantyReport } from "@/actions/warranty"
import { WarrantyBoard } from "@/components/warranty/WarrantyBoard"
import { PageHelp } from "@/components/layout/PageHelp"

function isoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default async function WarrantyPage() {
  const to = new Date()
  to.setHours(23, 59, 59, 999)
  const from = new Date()
  from.setDate(from.getDate() - 29)
  from.setHours(0, 0, 0, 0)

  const [activeClaims, report] = await Promise.all([
    listActiveWarrantyClaims(),
    getWarrantyReport(from.toISOString(), to.toISOString()),
  ])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Warranty / RMA
          </h1>
          <PageHelp title="Warranty / RMA">
            <p>
              This tab starts at the POS, not here — when a cashier scans a
              serial that&apos;s already sold, they get a return-triage prompt
              with five options. Only <strong>Warranty Claim</strong> has a
              built workflow; the other four (Return, Replacement, Buy-back,
              Trade-in) just get logged for reference and don&apos;t appear here.
            </p>
            <ul>
              <li>Picking Warranty Claim at the POS opens a receiving checklist (sticker / RAM-HDD / charger / free gifts) and prints a claim slip — that&apos;s when the unit lands in this tab.</li>
              <li><strong>Settle</strong> — repaired and given back to the customer; the unit&apos;s status reverts to Sold (it can come back through warranty again later).</li>
              <li><strong>Return to Stock</strong> — can&apos;t be repaired, so it goes back to sellable inventory at its existing price (no automatic discount is applied).</li>
              <li>The report below counts received / settled / returned-to-stock over the date range you pick.</li>
            </ul>
          </PageHelp>
        </div>
        <p className="text-slate-500 mt-1">
          Units received back under warranty — settle them or return them to sellable stock.
        </p>
      </div>

      <WarrantyBoard
        initialActiveClaims={activeClaims}
        initialReport={report}
        defaultFrom={isoDateOnly(from)}
        defaultTo={isoDateOnly(to)}
      />
    </div>
  )
}
