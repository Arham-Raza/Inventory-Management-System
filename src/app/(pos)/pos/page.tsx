import { POSClient } from "@/components/pos/POSClient"
import prisma from "@/lib/prisma"

export default async function POSPage() {
  const rawDiscounts = await prisma.discountCampaign.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  })

  // Convert Decimal fields to plain numbers before passing to the client component
  const activeDiscounts = rawDiscounts.map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    value: Number(d.value),
  }))

  return (
    <main className="min-h-screen bg-slate-100">
      <POSClient activeDiscounts={activeDiscounts} />
    </main>
  )
}
