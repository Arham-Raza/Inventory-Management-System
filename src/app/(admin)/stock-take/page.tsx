import { listStockTakeSessions } from "@/actions/stocktake"
import { StockTakeBoard } from "@/components/stocktake/StockTakeBoard"
import { PageHelp } from "@/components/layout/PageHelp"

export default async function StockTakePage() {
  const sessions = await listStockTakeSessions()

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Stock-Take &amp; Reconciliation
          </h1>
          <PageHelp title="Stock-Take & Reconciliation">
            <p>
              A physical stock count: start a session, scan every laptop you
              can find on the shelf, then close it to get a reconciliation
              report.
            </p>
            <ul>
              <li>Scanning the same serial twice in one session doesn&apos;t inflate the count — it&apos;s recognized as already counted.</li>
              <li><strong>Found</strong> — expected (Available) and scanned. <strong>Missing</strong> — expected but never scanned. <strong>Unrecognized</strong> — scanned but not in the system, or found but not marked Available (e.g. it shows as Sold).</li>
              <li>Multiple sessions can run at the same time — useful if different staff are covering different sections.</li>
              <li>There&apos;s no location/warehouse split — a session always covers every Available unit.</li>
            </ul>
          </PageHelp>
        </div>
        <p className="text-slate-500 mt-1">
          Scan every available unit during a count session to see what&apos;s
          found, missing, or unrecognized.
        </p>
      </div>

      <StockTakeBoard initialSessions={sessions} />
    </div>
  )
}
