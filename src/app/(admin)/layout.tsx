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
  // DATA_ENTRY is allowed onto /component-prices (see src/proxy.ts) — the
  // path-based decision belongs there, not in this layout, which has no
  // pathname to check against.

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar session={session} />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}