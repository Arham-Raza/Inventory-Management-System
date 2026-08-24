import { LoginForm } from "./login-form"
import Image from "next/image"
import { ShieldCheck, Package, Receipt } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* ── LEFT: Brand panel ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] bg-brand-navy flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10">
          {/* Logo */}
          <div className="h-10 w-48 relative mb-16">
            <Image
              src="/images/logo-white.png"
              alt="TechRevalo"
              fill
              className="object-contain object-left"
              priority
            />
          </div>

          {/* Hero copy */}
          <div className="space-y-4">
            <h1 className="text-4xl font-black text-white leading-tight tracking-tight">
              Your complete
              <br />
              <span className="text-primary">POS & Inventory</span>
              <br />
              system.
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-xs">
              Serialized laptop tracking, thermal receipts, and real-time
              accounting — renewed performance, premium quality.
            </p>
          </div>

          {/* Feature list */}
          <div className="mt-12 space-y-4">
            {[
              {
                icon: ShieldCheck,
                title: "Concurrency-safe checkout",
                desc: "Atomic transactions prevent double-selling the same unit.",
              },
              {
                icon: Package,
                title: "Serial-number asset tracking",
                desc: "Every laptop tracked individually from intake to sale.",
              },
              {
                icon: Receipt,
                title: "Legal warranty receipts",
                desc: "Spec-confirmed serial, CPU, GPU, RAM, and storage printed.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="p-2 bg-white/5 rounded-lg border border-white/10 shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    {title}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} TechRevalo · Karachi, Pakistan
          </p>
        </div>
      </div>

      {/* ── RIGHT: Login form ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo (hidden on lg+) */}
          <div className="lg:hidden h-8 w-44 relative mb-8 mx-auto">
            <Image
              src="/images/logo.png"
              alt="TechRevalo"
              fill
              className="object-contain"
              priority
            />
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
