"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { hash } from "bcryptjs"
import { Role } from "@prisma/client"

export async function createEmployee(data: {
  name: string
  email: string
  passwordRaw: string
  role: Role
}) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") throw new Error("Unauthorized")

  const hashedPassword = await hash(data.passwordRaw, 10)

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role
    }
  })

  revalidatePath("/employees")
  // Never return the password hash to the client, and only plain values can
  // cross the Server Action → Client Component boundary.
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

export async function getAllEmployees() {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") throw new Error("Unauthorized")

  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: {
        select: { orders: true }
      }
    },
    orderBy: { createdAt: "desc" }
  })
}
