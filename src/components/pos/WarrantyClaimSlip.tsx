import Image from "next/image"

type WarrantyClaimSlipProps = {
  claim: {
    id: string
    serialNumber: string
    modelName: string
    processor: string
    ram: string
    storage: string
    stickerPresent: boolean
    ramHddMatches: boolean
    chargerReturned: boolean
    freeGiftsReturned: boolean
    createdAt: string
  } | null
}

function YesNo({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex justify-between">
      <span>{label} :</span>
      <span className="font-bold">{value ? "YES" : "NO"}</span>
    </div>
  )
}

export function WarrantyClaimSlip({ claim }: WarrantyClaimSlipProps) {
  if (!claim) return null

  const date = new Date(claim.createdAt).toLocaleString("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  return (
    <div className="receipt-container hidden print:block font-mono text-[11px] p-3 text-black bg-white">
      <div className="text-center mb-3 pb-3 border-b border-dashed border-black">
        <div className="relative w-32 h-8 mx-auto mb-1">
          <Image src="/images/logo.png" alt="TechRevalo" fill className="object-contain grayscale" />
        </div>
        <div className="text-[11px] font-bold tracking-wide mt-1">WARRANTY CLAIM SLIP</div>
        <div className="text-[10px] mt-1 font-semibold">{date}</div>
      </div>

      <div className="mb-3 pb-3 border-b border-dashed border-black space-y-0.5">
        <div className="font-bold">{claim.modelName}</div>
        <div>CPU     : {claim.processor}</div>
        <div>RAM     : {claim.ram}</div>
        <div>Storage : {claim.storage}</div>
        <div className="font-bold tracking-wide">S/N     : {claim.serialNumber}</div>
        <div className="tracking-wide">Claim # : {claim.id.slice(-8).toUpperCase()}</div>
      </div>

      <div className="mb-3 pb-3 border-b border-dashed border-black space-y-1">
        <div className="font-bold mb-1 text-[10px] uppercase tracking-widest">Received Checklist</div>
        <YesNo label="Warranty sticker present" value={claim.stickerPresent} />
        <YesNo label="RAM/HDD matches sale" value={claim.ramHddMatches} />
        <YesNo label="Charger returned" value={claim.chargerReturned} />
        <YesNo label="Free gifts returned" value={claim.freeGiftsReturned} />
      </div>

      <div className="text-center text-[10px] pt-1 space-y-1 leading-relaxed">
        <div className="font-bold">Bring this slip when collecting your claim.</div>
        <div>Thank you for choosing TechRevalo!</div>
      </div>
    </div>
  )
}
