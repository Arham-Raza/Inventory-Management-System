"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  Boxes,
  Tags,
  LogOut,
  MonitorSmartphone,
  Calculator,
  UserCheck,
  ChevronRight,
  Cpu,
  Repeat,
  Wrench,
  ShieldCheck,
  HardHat,
  ClipboardCheck,
} from "lucide-react"
import { signOut } from "next-auth/react"
import Image from "next/image"

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  allowedRoles: string[]
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    allowedRoles: ["SUPER_ADMIN", "MANAGER"],
  },
  {
    href: "/inventory",
    label: "Inventory Ledger",
    icon: Package,
    allowedRoles: ["SUPER_ADMIN", "MANAGER"],
  },
  {
    href: "/stock-take",
    label: "Stock-Take",
    icon: ClipboardCheck,
    allowedRoles: ["SUPER_ADMIN", "MANAGER"],
  },
  {
    href: "/accessories",
    label: "Accessories",
    icon: Boxes,
    allowedRoles: ["SUPER_ADMIN", "MANAGER"],
  },
  {
    href: "/component-movements",
    label: "Component Movements",
    icon: Repeat,
    allowedRoles: ["SUPER_ADMIN", "MANAGER"],
  },
  {
    href: "/repair",
    label: "Repair Dispatch",
    icon: Wrench,
    allowedRoles: ["SUPER_ADMIN", "MANAGER"],
  },
  {
    href: "/warranty",
    label: "Warranty / RMA",
    icon: ShieldCheck,
    allowedRoles: ["SUPER_ADMIN", "MANAGER"],
  },
  {
    href: "/walkin-repairs",
    label: "Walk-in Repairs",
    icon: HardHat,
    allowedRoles: ["SUPER_ADMIN", "MANAGER"],
  },
  {
    href: "/data-entry",
    label: "Receive Stock",
    icon: Tags,
    allowedRoles: ["SUPER_ADMIN", "MANAGER", "DATA_ENTRY"],
  },
  {
    href: "/accounting",
    label: "Accounting",
    icon: Calculator,
    allowedRoles: ["SUPER_ADMIN"],
  },
  {
    href: "/discounts",
    label: "Discounts",
    icon: Tags,
    allowedRoles: ["SUPER_ADMIN"],
  },
  {
    href: "/component-prices",
    label: "Component Prices",
    icon: Cpu,
    allowedRoles: ["SUPER_ADMIN", "MANAGER", "DATA_ENTRY"],
  },
  {
    href: "/employees",
    label: "Staff & Roles",
    icon: UserCheck,
    allowedRoles: ["SUPER_ADMIN"],
  },
]

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  MANAGER:     "text-blue-400 bg-blue-500/10 border-blue-500/20",
  DATA_ENTRY:  "text-amber-400 bg-amber-500/10 border-amber-500/20",
  CASHIER:     "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
}

export function AdminSidebar({ session }: { session: any }) {
  const pathname = usePathname()
  const role = (session?.user?.role as string) || "CASHIER"
  const name = session?.user?.name || "Staff"

  const visibleRoutes = NAV_ITEMS.filter((r) =>
    r.allowedRoles.includes(role)
  )

  return (
    <aside className="w-64 bg-brand-navy border-r border-white/5 flex flex-col hidden md:flex shrink-0">

      {/* ── Logo ── */}
      <div className="px-5 py-6 border-b border-white/5">
        <div className="h-8 w-36 relative">
          <Image
            src="/images/logo-white.png"
            alt="TechRevalo"
            fill
            className="object-contain object-left"
          />
        </div>
        <p className="text-[10px] text-slate-500 mt-2 font-mono uppercase tracking-widest">
          POS & Inventory
        </p>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-3 pb-2">
          Main Menu
        </p>

        {visibleRoutes.map((route) => {
          const isActive = pathname === route.href
          return (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-100 group",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-3">
                {/* Active left-border indicator */}
                <div
                  className={cn(
                    "w-0.5 h-4 rounded-full transition-all",
                    isActive ? "bg-primary" : "bg-transparent"
                  )}
                />
                <route.icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-slate-500 group-hover:text-slate-300"
                  )}
                />
                {route.label}
              </div>
              {isActive && (
                <ChevronRight className="h-3.5 w-3.5 text-primary/60 shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── POS Launch button ── */}
      {["CASHIER", "MANAGER", "SUPER_ADMIN"].includes(role) && (
        <div className="px-3 pb-3">
          <Link href="/pos" className="block">
            <button className="w-full flex items-center justify-center gap-2 h-12 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-[0.98]">
              <MonitorSmartphone className="h-4 w-4" />
              Launch POS Terminal
            </button>
          </Link>
        </div>
      )}

      {/* ── User info + sign out ── */}
      <div className="border-t border-white/5 px-4 py-4 space-y-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-300 truncate">
              {name}
            </p>
            <span
              className={cn(
                "inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border mt-0.5",
                ROLE_COLORS[role] ?? ROLE_COLORS.CASHIER
              )}
            >
              {role.replace("_", " ")}
            </span>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
