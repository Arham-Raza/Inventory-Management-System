import { listTechnicians } from "@/actions/repair"
import { listActiveWalkInJobs, getWalkInStats } from "@/actions/walkin"
import { WalkInBoard } from "@/components/walkin/WalkInBoard"
import { PageHelp } from "@/components/layout/PageHelp"

function isoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default async function WalkInRepairsPage() {
  const to = new Date()
  to.setHours(23, 59, 59, 999)
  const from = new Date()
  from.setDate(from.getDate() - 29)
  from.setHours(0, 0, 0, 0)

  const [technicians, activeJobs, stats] = await Promise.all([
    listTechnicians(),
    listActiveWalkInJobs(),
    getWalkInStats(from.toISOString(), to.toISOString()),
  ])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Walk-in Repairs
          </h1>
          <PageHelp title="Walk-in Repairs">
            <p>
              For a customer&apos;s own device (one we never sold) brought in
              for repair, upgrade, or servicing. Kept entirely separate from
              our own inventory and from the Warranty tab.
            </p>
            <ul>
              <li><strong>New Walk-in Job</strong> — capture customer/device/issue details and an estimated cost, then immediately print a distinct barcode label (different design from our own stock labels, so it can never be confused with real inventory).</li>
              <li><strong>Complete</strong> — enter the final bill and what it cost the shop (parts/labor); the dialog shows the balance vs. the original estimate and the profit on the job before you confirm.</li>
              <li>There&apos;s no built-in refund policy — if the actual cost is lower than the estimate, the balance just shows as a credit and it&apos;s up to whoever closes the job.</li>
              <li>Technician assignment is optional — a job can stay in-house or go to one of the technicians used in Repair Dispatch.</li>
            </ul>
          </PageHelp>
        </div>
        <p className="text-slate-500 mt-1">
          Devices customers bring in that we didn&apos;t sell — own barcode, own
          tracking, own profit line.
        </p>
      </div>

      <WalkInBoard
        technicians={technicians.map((t) => ({ id: t.id, name: t.name }))}
        initialActiveJobs={activeJobs}
        initialStats={stats}
        defaultFrom={isoDateOnly(from)}
        defaultTo={isoDateOnly(to)}
      />
    </div>
  )
}
