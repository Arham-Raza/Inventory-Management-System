import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// Dummy stock for hardware testing: barcode sticker printing, POS scan-to-sell,
// the approval workflow, and the "not available" scanner guard. Idempotent —
// safe to rerun (upserts by serialNumber).
const ITEMS = [
  // ── AVAILABLE — scan these straight into the POS cart ──
  {
    serialNumber: "TR-LP-0001",
    lotNumber: "LOT-AUG26-01",
    modelName: "Dell Latitude 5420",
    processor: "Intel Core i5-1135G7",
    gpu: "Intel Iris Xe",
    ram: "8GB",
    storage: "256GB SSD",
    purchaseCost: 42000,
    retailPrice: 62000,
    status: "AVAILABLE" as const,
  },
  {
    serialNumber: "TR-LP-0002",
    lotNumber: "LOT-AUG26-01",
    modelName: "HP EliteBook 840 G7",
    processor: "Intel Core i7-10510U",
    gpu: "Intel UHD Graphics",
    ram: "16GB",
    storage: "512GB SSD",
    purchaseCost: 55000,
    retailPrice: 78000,
    status: "AVAILABLE" as const,
  },
  {
    serialNumber: "TR-LP-0003",
    lotNumber: "LOT-AUG26-01",
    modelName: "Lenovo ThinkPad T14 Gen 1",
    processor: "AMD Ryzen 5 PRO 4650U",
    gpu: "AMD Radeon Graphics",
    ram: "16GB",
    storage: "512GB SSD",
    purchaseCost: 48000,
    retailPrice: 69000,
    status: "AVAILABLE" as const,
  },
  {
    serialNumber: "TR-LP-0004",
    lotNumber: "LOT-AUG26-02",
    modelName: "Dell Precision 3550",
    processor: "Intel Core i7-10510U",
    gpu: "NVIDIA Quadro P520",
    ram: "16GB",
    storage: "1TB SSD",
    purchaseCost: 72000,
    retailPrice: 98000,
    status: "AVAILABLE" as const,
  },
  {
    serialNumber: "TR-LP-0005",
    lotNumber: "LOT-AUG26-02",
    modelName: "HP ProBook 450 G6",
    processor: "Intel Core i5-8265U",
    gpu: "Intel UHD Graphics 620",
    ram: "8GB",
    storage: "256GB SSD",
    purchaseCost: 35000,
    retailPrice: 52000,
    status: "AVAILABLE" as const,
  },
  {
    serialNumber: "TR-LP-0006",
    lotNumber: "LOT-AUG26-02",
    modelName: "Lenovo IdeaPad 3 15",
    processor: "AMD Ryzen 3 5300U",
    gpu: "AMD Radeon Graphics",
    ram: "8GB",
    storage: "256GB SSD",
    purchaseCost: 28000,
    retailPrice: 42000,
    status: "AVAILABLE" as const,
  },
  // ── PENDING_APPROVAL — test the admin approve/reject workflow ──
  {
    serialNumber: "TR-LP-0007",
    lotNumber: "LOT-AUG26-03",
    modelName: "Dell Latitude 7410",
    processor: "Intel Core i7-10610U",
    gpu: "Intel UHD Graphics",
    ram: "16GB",
    storage: "512GB SSD",
    purchaseCost: 58000,
    retailPrice: 82000,
    status: "PENDING_APPROVAL" as const,
  },
  {
    serialNumber: "TR-LP-0008",
    lotNumber: "LOT-AUG26-03",
    modelName: "Acer TravelMate P2",
    processor: "Intel Core i5-1135G7",
    gpu: "Intel Iris Xe",
    ram: "8GB",
    storage: "256GB SSD",
    purchaseCost: 38000,
    retailPrice: 55000,
    status: "PENDING_APPROVAL" as const,
  },
  // ── SOLD — scanning this at POS should show "already sold" ──
  {
    serialNumber: "TR-LP-0009",
    lotNumber: "LOT-JUL26-05",
    modelName: "HP EliteBook 830 G6",
    processor: "Intel Core i5-8365U",
    gpu: "Intel UHD Graphics 620",
    ram: "8GB",
    storage: "256GB SSD",
    purchaseCost: 40000,
    retailPrice: 58000,
    status: "SOLD" as const,
  },
  // ── REJECTED — scanning this at POS should show "rejected" ──
  {
    serialNumber: "TR-LP-0010",
    lotNumber: "LOT-JUL26-05",
    modelName: "Lenovo ThinkPad E14",
    processor: "Intel Core i3-10110U",
    gpu: "Intel UHD Graphics",
    ram: "4GB",
    storage: "128GB SSD",
    purchaseCost: 22000,
    retailPrice: 34000,
    status: "REJECTED" as const,
  },
]

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: "admin@ecs.com" } })
  if (!admin) {
    throw new Error("Run `npx tsx src/scripts/seed.ts` first to create the admin user.")
  }

  for (const item of ITEMS) {
    const isDecided = item.status === "AVAILABLE" || item.status === "SOLD" || item.status === "REJECTED"
    await prisma.inventoryItem.upsert({
      where: { serialNumber: item.serialNumber },
      update: {},
      create: {
        ...item,
        createdById: admin.id,
        approvedById: isDecided ? admin.id : null,
        approvedAt: isDecided ? new Date() : null,
      },
    })
    console.log(`✓ ${item.status.padEnd(17)} ${item.serialNumber}  ${item.modelName}`)
  }

  console.log(`\nSeeded ${ITEMS.length} dummy inventory items.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
