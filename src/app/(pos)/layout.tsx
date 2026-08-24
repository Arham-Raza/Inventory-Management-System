import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function POSLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) redirect("/login")

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {children}
    </div>
  )
}