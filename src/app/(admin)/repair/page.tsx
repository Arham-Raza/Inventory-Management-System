import { listTechnicians, listActiveDispatches, getTechnicianLedger } from "@/actions/repair"
import { RepairDispatchBoard } from "@/components/repair/RepairDispatchBoard"
import { PageHelp } from "@/components/layout/PageHelp"

export default async function RepairPage() {
  const [technicians, activeDispatches, ledger] = await Promise.all([
    listTechnicians(),
    listActiveDispatches(),
    getTechnicianLedger(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Repair / Technician Dispatch
          </h1>
          <PageHelp title="Repair / Technician Dispatch">
            <p>
              For our own laptops that need to go out for repair — this is
              never a sale, and the unit comes off the sellable shelf count
              while it&apos;s out.
            </p>
            <ul>
              <li><strong>Send Units to Repair</strong> — scan serials, add remarks per item, optionally set an expected return date, then send. A delivery-order Excel sheet is offered right after.</li>
              <li><strong>Currently With Technicians</strong> — everything out right now; an overdue item (past its expected return date) is flagged in amber.</li>
              <li>The <strong>repair cost is entered when the unit comes back</strong>, not when it&apos;s sent out — that&apos;s when a technician actually names a price.</li>
              <li><strong>Technician Cost Ledger</strong> — running spend per technician, month-to-date and all-time.</li>
              <li>This is for our own inventory only — a customer&apos;s own device goes through <strong>Walk-in Repairs</strong> instead.</li>
            </ul>
          </PageHelp>
        </div>
        <p className="text-slate-500 mt-1">
          Send units out for repair without it counting as a sale, track who currently
          holds what, and see spend per technician.
        </p>
      </div>

      <RepairDispatchBoard
        technicians={technicians.map((t) => ({ id: t.id, name: t.name, phone: t.phone, specialty: t.specialty }))}
        initialActiveDispatches={activeDispatches}
        initialLedger={ledger}
      />
    </div>
  )
}
