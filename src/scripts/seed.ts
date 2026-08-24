import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const USERS = [
  {
    name: "Admin",
    email: "admin@ecs.com",
    password: "admin123",
    role: "SUPER_ADMIN" as const,
  },
  {
    name: "Manager",
    email: "manager@ecs.com",
    password: "manager123",
    role: "MANAGER" as const,
  },
  {
    name: "Data Entry",
    email: "dataentry@ecs.com",
    password: "dataentry123",
    role: "DATA_ENTRY" as const,
  },
  {
    name: "Cashier",
    email: "cashier@ecs.com",
    password: "cashier123",
    role: "CASHIER" as const,
  },
]

async function main() {
  for (const user of USERS) {
    const hashed = await bcrypt.hash(user.password, 10)
    await prisma.user.upsert({
      where: { email: user.email },
      update: { password: hashed, role: user.role },
      create: {
        name: user.name,
        email: user.email,
        password: hashed,
        role: user.role,
      },
    })
    console.log(`✓ ${user.role}: ${user.email} / ${user.password}`)
  }

  console.log("\nSeeding complete. Change all passwords after first login.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
