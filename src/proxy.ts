import { NextResponse } from "next/server"
import { auth } from "@/auth"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const role = req.auth?.user?.role

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth")
  const isPublicRoute = nextUrl.pathname === "/login"

  if (isApiAuthRoute) return NextResponse.next()

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  if (isLoggedIn && isPublicRoute) {
    if (role === "CASHIER") return NextResponse.redirect(new URL("/pos", nextUrl))
    if (role === "DATA_ENTRY") return NextResponse.redirect(new URL("/data-entry", nextUrl))
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  // RBAC Enforcement
  if (isLoggedIn) {
    if (role === "CASHIER") {
      // Cashiers can ONLY hit /pos
      if (!nextUrl.pathname.startsWith("/pos")) {
        return NextResponse.redirect(new URL("/pos", nextUrl))
      }
    }

    if (role === "DATA_ENTRY") {
      // Data Entry can ONLY hit /data-entry
      if (!nextUrl.pathname.startsWith("/data-entry")) {
        return NextResponse.redirect(new URL("/data-entry", nextUrl))
      }
    }

    if (role === "MANAGER") {
      // Managers cannot hit accounting, discounts, or employees
      if (
        nextUrl.pathname.startsWith("/accounting") || 
        nextUrl.pathname.startsWith("/discounts") || 
        nextUrl.pathname.startsWith("/employees")
      ) {
        return NextResponse.redirect(new URL("/dashboard", nextUrl))
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|images|favicon.ico).*)'],
}
