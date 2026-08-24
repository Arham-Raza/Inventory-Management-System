import { AdminSidebar } from "@/components/layout/Sidebar"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function DataEntryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) redirect("/login")

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar session={session} />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
