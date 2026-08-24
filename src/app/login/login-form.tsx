"use client"

import { useState } from "react"
import { loginAction } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle } from "lucide-react"

export function LoginForm() {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    
    try {
      const res = await loginAction(formData)
      if (res?.error) {
        setError(res.error)
        setLoading(false)
      }
      // If success, NextAuth's signIn throws NEXT_REDIRECT which the framework handles natively
    } catch (err: any) {
      if (err.message && err.message.includes('NEXT_REDIRECT')) {
        // Expected redirect
        return;
      }
      console.error(err)
      setError("A server error occurred. Check if the database is running.")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Welcome back
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Sign in to access the POS system
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-sm font-semibold text-slate-700"
          >
            Email address
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            required
            disabled={loading}
            className="h-11 border-slate-300 focus-visible:border-primary focus-visible:ring-primary/30"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="password"
            className="text-sm font-semibold text-slate-700"
          >
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            disabled={loading}
            className="h-11 border-slate-300 focus-visible:border-primary focus-visible:ring-primary/30"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11 text-sm font-bold bg-primary hover:bg-primary/90 shadow-sm"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Signing in…
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <p className="text-xs text-center text-slate-400">
        Internal system — contact your admin if you&apos;ve lost access.
      </p>
    </div>
  )
}
