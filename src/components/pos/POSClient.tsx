"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { lookupInventoryItem, type InventoryLookupResult } from "@/actions/pos"
import { createOrder } from "@/actions/order"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Trash2,
  ShoppingCart,
  Loader2,
  Scan,
  CheckCircle2,
  Cpu,
  HardDrive,
  Database,
  Tag,
  AlertTriangle,
  Banknote,
  CreditCard,
  Building2,
  ShieldCheck,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner"
import { calculateOrderTotals, formatCurrency } from "@/lib/money"
import { printAtSize } from "@/lib/print"
import { ThermalReceipt } from "./ThermalReceipt"
import Image from "next/image"

export type CartItem = {
  serialNumber: string
  modelName: string
  processor: string
  gpu: string
  confirmedRam: string
  confirmedStorage: string
  retailPrice: number
}

export type PaymentMethod = "CASH" | "CARD" | "TRANSFER"

type ActiveDiscount = {
  id: string
  name: string
  type: string
  value: number
}

type PendingItem = InventoryLookupResult & {
  confirmedRam: string
  confirmedStorage: string
}

type ManagerOverride = {
  type: "PERCENTAGE" | "FIXED"
  value: number
  reason: string
  managerEmail: string
  managerPassword: string
}

const PAYMENT_OPTIONS: {
  id: PaymentMethod
  label: string
  sublabel: string
  icon: React.ElementType
}[] = [
  { id: "CASH",     label: "Cash",     sublabel: "Banknotes", icon: Banknote   },
  { id: "CARD",     label: "Card",     sublabel: "Debit/Credit", icon: CreditCard },
  { id: "TRANSFER", label: "Transfer", sublabel: "Bank/EasyPaisa", icon: Building2  },
]

export function POSClient({
  activeDiscounts,
}: {
  activeDiscounts: ActiveDiscount[]
}) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [scanInput, setScanInput] = useState("")
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [appliedDiscountId, setAppliedDiscountId] = useState<string>("none")
  const [pendingItem, setPendingItem] = useState<PendingItem | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH")
  const [managerOverride, setManagerOverride] = useState<ManagerOverride | null>(null)
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false)
  const [overrideForm, setOverrideForm] = useState({
    type: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    value: "",
    reason: "",
    managerEmail: "",
    managerPassword: "",
  })

  const scanInputRef = useRef<HTMLInputElement>(null)

  const focusScanner = useCallback(() => {
    setTimeout(() => scanInputRef.current?.focus(), 60)
  }, [])

  useEffect(() => {
    if (!pendingItem) focusScanner()
  }, [cart, pendingItem, focusScanner])

  // ── Scan handler ────────────────────────────────────────────────────────────
  const handleScan = useCallback(
    async (raw: string) => {
      const sn = raw.trim()
      if (!sn) return

      if (cart.some((c) => c.serialNumber === sn)) {
        toast.warning("Already in cart", {
          description: `Serial ${sn} is already on this order.`,
        })
        return
      }

      setIsLookingUp(true)
      try {
        const item = await lookupInventoryItem(sn)

        if (!item) {
          toast.error("Not found", {
            description: `Serial "${sn}" does not exist in inventory.`,
          })
          return
        }
        if (item.status !== "AVAILABLE") {
          const messages: Record<string, string> = {
            SOLD: "has already been sold",
            RETURNED: "is marked RETURNED",
            PENDING_APPROVAL: "is awaiting admin approval and isn't sellable yet",
            REJECTED: "was rejected during approval and isn't sellable",
          }
          toast.error("Not available for sale", {
            description: `"${item.modelName}" (${sn}) ${
              messages[item.status] ?? `has status ${item.status}`
            }.`,
            duration: 6000,
            icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
          })
          return
        }

        setPendingItem({
          ...item,
          confirmedRam: item.ram,
          confirmedStorage: item.storage,
        })
      } catch {
        toast.error("Lookup failed", {
          description: "Could not reach the server. Check your connection.",
        })
      } finally {
        setIsLookingUp(false)
      }
    },
    [cart]
  )

  // Global hardware-scanner fallback (fires when no text input is focused)
  useBarcodeScanner(
    useCallback(
      (barcode: string) => {
        if (!pendingItem) handleScan(barcode)
      },
      [pendingItem, handleScan]
    )
  )

  const handleScanFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const sn = scanInput.trim()
    setScanInput("")
    if (sn) handleScan(sn)
  }

  // ── Spec confirmation ────────────────────────────────────────────────────────
  const confirmAddToCart = () => {
    if (!pendingItem) return
    setCart((prev) => [
      ...prev,
      {
        serialNumber: pendingItem.serialNumber,
        modelName: pendingItem.modelName,
        processor: pendingItem.processor,
        gpu: pendingItem.gpu,
        confirmedRam: pendingItem.confirmedRam,
        confirmedStorage: pendingItem.confirmedStorage,
        retailPrice: pendingItem.retailPrice,
      },
    ])
    toast.success("Added to cart", { description: pendingItem.modelName })
    setPendingItem(null)
  }

  const cancelPendingItem = () => {
    setPendingItem(null)
    focusScanner()
  }

  const removeFromCart = (sn: string) => {
    setCart((prev) => prev.filter((c) => c.serialNumber !== sn))
  }

  // ── Totals ──────────────────────────────────────────────────────────────────
  // Manager override and a promotion campaign are mutually exclusive.
  const selectedCampaign =
    appliedDiscountId !== "none"
      ? (activeDiscounts.find((d) => d.id === appliedDiscountId) ?? null)
      : null
  const discountSource = managerOverride
    ? { type: managerOverride.type, value: managerOverride.value }
    : selectedCampaign
  const discountLabel = managerOverride
    ? `Manager Override — ${managerOverride.reason}`
    : selectedCampaign?.name

  const subtotal = cart.reduce((sum, item) => sum + item.retailPrice, 0)
  const { discountAmount, tax, total } = calculateOrderTotals(
    subtotal,
    discountSource
  )

  // ── Manager override dialog ────────────────────────────────────────────────
  const handleApplyOverride = (e: React.FormEvent) => {
    e.preventDefault()
    const value = parseFloat(overrideForm.value)
    if (
      !overrideForm.reason.trim() ||
      !overrideForm.managerEmail.trim() ||
      !overrideForm.managerPassword ||
      !Number.isFinite(value) ||
      value <= 0
    ) {
      toast.error("Fill in every field with a valid discount value")
      return
    }
    setManagerOverride({
      type: overrideForm.type,
      value,
      reason: overrideForm.reason.trim(),
      managerEmail: overrideForm.managerEmail.trim(),
      managerPassword: overrideForm.managerPassword,
    })
    setAppliedDiscountId("none")
    setOverrideDialogOpen(false)
    setOverrideForm({ type: "PERCENTAGE", value: "", reason: "", managerEmail: "", managerPassword: "" })
    toast.info("Manager override staged", {
      description: "Credentials are verified when checkout completes.",
    })
  }

  const removeOverride = () => setManagerOverride(null)

  // ── Checkout ─────────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) return
    setIsProcessing(true)

    try {
      const result = await createOrder({
        appliedDiscountId:
          appliedDiscountId !== "none" && !managerOverride ? appliedDiscountId : undefined,
        managerOverride: managerOverride ?? undefined,
        items: cart.map((item) => ({
          serialNumber: item.serialNumber,
          confirmedRam: item.confirmedRam,
          confirmedStorage: item.confirmedStorage,
        })),
      })

      printAtSize("80mm auto")

      setCart([])
      setAppliedDiscountId("none")
      setManagerOverride(null)
      setPaymentMethod("CASH")
      toast.success("Transaction complete", {
        description: `Order #${result.orderId.slice(-8).toUpperCase()} · ${formatCurrency(result.total)} · ${paymentMethod}`,
        duration: 7000,
      })
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Checkout failed. Please retry."
      toast.error("Checkout failed", { description: msg, duration: 10000 })
      // Don't hold a manager's plaintext password in memory after a failed attempt —
      // clear the staged override so re-authorizing means re-entering it fresh.
      if (managerOverride) setManagerOverride(null)
    } finally {
      setIsProcessing(false)
      focusScanner()
    }
  }

  // ── Pay button label changes by payment method ────────────────────────────
  const payLabel =
    paymentMethod === "CASH"
      ? "Collect Cash"
      : paymentMethod === "CARD"
      ? "Process Card"
      : "Confirm Transfer"

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex h-screen bg-slate-100 overflow-hidden print:hidden">

        {/* ══ LEFT PANEL: scanner + item cards ══ */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Header bar */}
          <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shadow-sm shrink-0">
            <div className="h-8 w-40 relative">
              <Image
                src="/images/logo.png"
                alt="TechRevalo"
                fill
                className="object-contain object-left"
              />
            </div>
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                isLookingUp
                  ? "bg-amber-50 text-amber-700"
                  : "bg-emerald-50 text-emerald-700"
              )}
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  isLookingUp ? "bg-amber-400" : "bg-emerald-400"
                )}
              />
              {isLookingUp ? "Looking up…" : "Scanner Ready"}
            </div>
          </header>

          {/* Scanner input */}
          <div className="px-6 pt-5 pb-4 shrink-0">
            <form onSubmit={handleScanFormSubmit}>
              <div className="relative">
                <Scan className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                <Input
                  ref={scanInputRef}
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Scan barcode or type serial number, then press Enter…"
                  className="pl-11 h-14 text-lg bg-white border-slate-300 rounded-xl shadow-sm font-mono focus-visible:ring-primary/40 focus-visible:border-primary"
                  disabled={isProcessing}
                  autoFocus
                />
              </div>
            </form>
          </div>

          {/* Scanned item cards */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 select-none pointer-events-none">
                <ShoppingCart className="h-16 w-16 opacity-20 mb-4" />
                <p className="text-lg font-semibold opacity-50">
                  No items scanned yet
                </p>
                <p className="text-sm opacity-40 mt-1">
                  Scan a barcode to begin
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {cart.map((item) => (
                  <div
                    key={item.serialNumber}
                    className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="font-bold text-slate-900 text-base leading-snug">
                          {item.modelName}
                        </h3>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded shrink-0">
                          {item.serialNumber}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{item.processor}</span>
                        </div>
                        {item.gpu && (
                          <div className="flex items-center gap-2">
                            <Tag className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{item.gpu}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Database className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>
                            {item.confirmedRam} · {item.confirmedStorage}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                      <span className="text-xl font-black text-primary tracking-tight">
                        {formatCurrency(item.retailPrice)}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.serialNumber)}
                        className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        aria-label={`Remove ${item.modelName}`}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══ RIGHT PANEL: order summary + checkout ══ */}
        <aside className="w-[400px] xl:w-[440px] bg-white border-l border-slate-200 flex flex-col shadow-2xl z-10 shrink-0">

          {/* Cart header */}
          <div className="px-6 py-5 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                Current Order
              </h2>
              {cart.length > 0 && (
                <span className="text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                  {cart.length} item{cart.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-sm text-slate-400">
                Cart is empty
              </div>
            ) : (
              <div className="divide-y divide-slate-50 px-6">
                {cart.map((item) => (
                  <div
                    key={item.serialNumber}
                    className="py-4 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm leading-snug">
                        {item.modelName}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {item.serialNumber}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.confirmedRam} / {item.confirmedStorage}
                      </p>
                    </div>
                    <span className="font-bold text-slate-800 text-sm whitespace-nowrap">
                      {formatCurrency(item.retailPrice)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals + checkout */}
          <div className="border-t border-slate-100 p-6 space-y-4 shrink-0 bg-slate-50/60">

            {/* Discount selector */}
            {activeDiscounts.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Promotion
                </label>
                <Select
                  value={appliedDiscountId}
                  onValueChange={(v) => {
                    setAppliedDiscountId(v ?? "none")
                    if (v && v !== "none") setManagerOverride(null)
                  }}
                  disabled={!!managerOverride}
                >
                  <SelectTrigger className="bg-white border-slate-200 h-10 text-sm">
                    <SelectValue placeholder="No discount" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No discount</SelectItem>
                    {activeDiscounts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} —{" "}
                        {d.type === "PERCENTAGE"
                          ? `−${d.value}%`
                          : `−${formatCurrency(d.value)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Manager override */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Manager Override
              </label>
              {managerOverride ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-violet-700">
                      {managerOverride.type === "PERCENTAGE"
                        ? `−${managerOverride.value}%`
                        : `−${formatCurrency(managerOverride.value)}`}{" "}
                      staged
                    </p>
                    <p className="text-[11px] text-violet-600 truncate">{managerOverride.reason}</p>
                  </div>
                  <button
                    onClick={removeOverride}
                    className="p-1.5 rounded-md text-violet-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                    aria-label="Remove manager override"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 text-sm border-slate-200"
                  onClick={() => setOverrideDialogOpen(true)}
                  disabled={appliedDiscountId !== "none"}
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Apply Manager Discount
                </Button>
              )}
            </div>

            {/* Financial breakdown */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>
                    Discount
                    {discountLabel ? ` (${discountLabel})` : ""}
                  </span>
                  <span>− {formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span>GST (18%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
            </div>

            <div className="border-t border-slate-200" />

            {/* Total */}
            <div className="flex justify-between items-baseline">
              <span className="text-base font-bold text-slate-900">Total</span>
              <span className="text-3xl font-black text-primary tracking-tighter leading-none">
                {formatCurrency(total)}
              </span>
            </div>

            {/* ── Payment method selector ── */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_OPTIONS.map(({ id, label, sublabel, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setPaymentMethod(id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-bold transition-all duration-150",
                      paymentMethod === id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{label}</span>
                    <span
                      className={cn(
                        "text-[9px] font-normal leading-none",
                        paymentMethod === id
                          ? "text-primary/70"
                          : "text-slate-400"
                      )}
                    >
                      {sublabel}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* PAY button */}
            <Button
              className={cn(
                "w-full h-16 text-xl font-black tracking-wide rounded-2xl shadow-lg transition-all duration-150 active:scale-[0.98]",
                paymentMethod === "CASH"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : paymentMethod === "CARD"
                  ? "bg-primary hover:bg-primary/90 text-white"
                  : "bg-violet-600 hover:bg-violet-700 text-white"
              )}
              disabled={cart.length === 0 || isProcessing}
              onClick={handleCheckout}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin mr-3" />
                  Processing…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6 mr-3" />
                  {payLabel}
                  {cart.length > 0 && (
                    <span className="ml-2 opacity-90">· {formatCurrency(total)}</span>
                  )}
                </>
              )}
            </Button>

            {cart.length > 0 && !isProcessing && (
              <button
                onClick={() => {
                  setCart([])
                  setAppliedDiscountId("none")
                }}
                className="w-full text-center text-xs text-slate-400 hover:text-red-500 transition-colors py-1"
              >
                Clear all items
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* ══ SPEC CONFIRMATION DIALOG ══ */}
      <Dialog
        open={!!pendingItem}
        onOpenChange={(open) => {
          if (!open) cancelPendingItem()
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Confirm Item Specifications
            </DialogTitle>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              Verify the physical RAM and Storage installed in this unit.
              Edit if the unit was reconfigured since intake.
            </p>
          </DialogHeader>

          {pendingItem && (
            <div className="space-y-4 py-1">
              {/* Locked base specs */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-slate-900 text-base leading-snug">
                    {pendingItem.modelName}
                  </span>
                  <span className="text-[10px] font-mono bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded shrink-0">
                    {pendingItem.serialNumber}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{pendingItem.processor}</span>
                  </div>
                  {pendingItem.gpu && (
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{pendingItem.gpu}</span>
                    </div>
                  )}
                </div>
                <div className="text-xl font-black text-primary">
                  {formatCurrency(pendingItem.retailPrice)}
                </div>
              </div>

              {/* Editable RAM + Storage */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Database className="h-3.5 w-3.5" />
                    RAM
                  </label>
                  <Input
                    value={pendingItem.confirmedRam}
                    onChange={(e) =>
                      setPendingItem((p) =>
                        p ? { ...p, confirmedRam: e.target.value } : p
                      )
                    }
                    className="font-mono"
                    placeholder="e.g. 16GB DDR4"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <HardDrive className="h-3.5 w-3.5" />
                    Storage
                  </label>
                  <Input
                    value={pendingItem.confirmedStorage}
                    onChange={(e) =>
                      setPendingItem((p) =>
                        p ? { ...p, confirmedStorage: e.target.value } : p
                      )
                    }
                    className="font-mono"
                    placeholder="e.g. 512GB NVMe"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={cancelPendingItem}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAddToCart}
              className="flex-1 bg-primary hover:bg-primary/90 font-bold"
              disabled={
                !pendingItem?.confirmedRam.trim() ||
                !pendingItem?.confirmedStorage.trim()
              }
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ MANAGER OVERRIDE DIALOG ══ */}
      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Manager Discount Override</DialogTitle>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              Requires a MANAGER or SUPER_ADMIN to authorize with their own credentials.
              Verified when checkout completes.
            </p>
          </DialogHeader>

          <form onSubmit={handleApplyOverride} className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Type
                </label>
                <Select
                  value={overrideForm.type}
                  onValueChange={(v) =>
                    setOverrideForm((f) => ({ ...f, type: (v as "PERCENTAGE" | "FIXED") ?? "PERCENTAGE" }))
                  }
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="FIXED">Fixed Amount (RM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Value
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={overrideForm.value}
                  onChange={(e) => setOverrideForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder={overrideForm.type === "PERCENTAGE" ? "10" : "50"}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Reason (required)
              </label>
              <Textarea
                value={overrideForm.reason}
                onChange={(e) => setOverrideForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="e.g. Cosmetic damage negotiated with customer"
                rows={2}
              />
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Manager Authorization
              </p>
              <Input
                type="email"
                value={overrideForm.managerEmail}
                onChange={(e) => setOverrideForm((f) => ({ ...f, managerEmail: e.target.value }))}
                placeholder="manager@ecs.com"
                autoComplete="off"
              />
              <Input
                type="password"
                value={overrideForm.managerPassword}
                onChange={(e) => setOverrideForm((f) => ({ ...f, managerPassword: e.target.value }))}
                placeholder="Manager password"
                autoComplete="off"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOverrideDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 font-bold">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Apply Override
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══ THERMAL RECEIPT (print only) ══ */}
      <ThermalReceipt
        cart={cart}
        subtotal={subtotal}
        discountAmount={discountAmount}
        discountName={discountLabel}
        tax={tax}
        total={total}
        paymentMethod={paymentMethod}
      />
    </>
  )
}
