// All internal arithmetic uses paisa (integer minor unit: 1 Rs = 100 paisa)
// to eliminate floating-point drift across discount, tax, and total calculations.

const TAX_RATE_PERCENT = 18

function toPaisa(rupees: number): number {
  return Math.round(rupees * 100)
}

function fromPaisa(paisa: number): number {
  return paisa / 100
}

export function calculateDiscount(
  subtotal: number,
  discount: { type: string; value: number } | null
): number {
  if (!discount) return 0
  if (discount.type === "PERCENTAGE") {
    return fromPaisa(Math.round(toPaisa(subtotal) * discount.value / 100))
  }
  // FIXED — clamp so total never goes negative
  return Math.min(discount.value, subtotal)
}

export function calculateTax(taxableAmount: number): number {
  return fromPaisa(Math.round(toPaisa(taxableAmount) * TAX_RATE_PERCENT / 100))
}

export function calculateOrderTotals(
  subtotal: number,
  discount: { type: string; value: number } | null,
  pointsRedemptionValue: number = 0
) {
  const discountAmount = calculateDiscount(subtotal, discount)
  const afterDiscount = Math.max(0, subtotal - discountAmount)
  // Clamp so redeemed points can never push the total below zero.
  const redemptionAmount = Math.min(Math.max(0, pointsRedemptionValue), afterDiscount)
  const discountedSubtotal = Math.max(0, afterDiscount - redemptionAmount)
  const tax = calculateTax(discountedSubtotal)
  const total = fromPaisa(toPaisa(discountedSubtotal) + toPaisa(tax))
  return { discountAmount, redemptionAmount, discountedSubtotal, tax, total }
}

export function formatCurrency(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}
