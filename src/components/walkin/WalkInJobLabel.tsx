import Barcode from "react-barcode"

// Deliberately different from a normal stock/accessory label (black header
// band + "WALK-IN" callout) so it can't be mistaken for our own inventory —
// this device was never ours.
export function WalkInJobLabel({
  barcode,
  jobType,
  customerName,
}: {
  barcode: string
  jobType: string
  customerName: string
}) {
  return (
    <div className="walkin-label-container hidden w-[50mm] h-[25mm] flex-col items-center justify-center bg-white text-black p-1">
      <div className="w-full bg-black text-white text-[7px] font-bold text-center tracking-widest py-[1px] mb-0.5">
        WALK-IN — {jobType}
      </div>
      <Barcode value={barcode} width={1.1} height={22} fontSize={8} margin={0} />
      <div className="text-[6.5px] leading-none font-semibold max-w-[46mm] truncate mt-0.5">
        {customerName}
      </div>
    </div>
  )
}
