"use server"

import { signIn } from "@/auth"
import { AuthError } from "next-auth"
import { LoginSchema } from "@/lib/validations"
import { isRateLimited } from "@/lib/rate-limit"

export async function loginAction(formData: FormData) {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const email = parsed.data.email
  // 5 attempts per minute per email
  if (isRateLimited(`login:${email}`, 5, 60 * 1000)) {
    return { error: "Too many login attempts. Please try again in a minute." }
  }

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/" })
    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." }
        default:
          return { error: "An authentication error occurred." }
      }
    }
    // NEXT_REDIRECT errors are thrown by NextAuth on success, rethrow it
    throw error
  }
}
