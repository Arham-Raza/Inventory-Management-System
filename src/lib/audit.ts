import prisma from "@/lib/prisma"

export async function logAuditAction(
  userId: string,
  action: string,
  details?: Record<string, any>
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details: details ? JSON.stringify(details) : null,
      },
    })
  } catch (error) {
    console.error("Failed to write audit log:", error)
  }
}
