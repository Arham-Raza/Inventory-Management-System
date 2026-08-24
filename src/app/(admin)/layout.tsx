import { AdminSidebar } from "@/components/layout/Sidebar"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) redirect("/login")

  const role = session.user?.role
  if (role === "CASHIER") redirect("/pos")
  if (role === "DATA_ENTRY") redirect("/data-entry")

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar session={session} />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}