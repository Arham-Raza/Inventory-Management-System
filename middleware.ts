import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: "/dashboard",
  MANAGER:     "/dashboard",
  DATA_ENTRY:  "/data-entry",
  CASHIER:     "/pos",
}

const SUPER_ADMIN_ONLY = ["/accounting", "/discounts", "/employees"]

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const { pathname } = req.nextUrl
  const role = token?.role as string | undefined

  // Not authenticated
  if (!token) {
    if (pathname === "/login") return NextResponse.next()
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Authenticated hitting /login → send to role home
  if (pathname === "/login") {
    return NextResponse.redirect(
      new URL(ROLE_HOME[role ?? ""] ?? "/dashboard", req.url)
    )
  }

  // CASHIER: only /pos allowed
  if (role === "CASHIER") {
    const allowed = pathname.startsWith("/pos") || pathname.startsWith("/api")
    if (!allowed) return NextResponse.redirect(new URL("/pos", req.url))
  }

  // DATA_ENTRY: only /data-entry allowed
  if (role === "DATA_ENTRY") {
    const allowed = pathname.startsWith("/data-entry") || pathname.startsWith("/api")
    if (!allowed) return NextResponse.redirect(new URL("/data-entry", req.url))
  }

  // MANAGER: block SUPER_ADMIN-only routes
  if (role === "MANAGER" && SUPER_ADMIN_ONLY.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images|favicon\\.ico).*)"],
}
