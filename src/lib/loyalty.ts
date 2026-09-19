// Loyalty program conversion rates — single source of truth, same pattern as
// TAX_RATE_PERCENT in money.ts. Adjust here if the business rate changes.

// Points earned per RM actually paid on an order (after discount + tax).
const POINTS_EARNED_PER_RM = 1

// 100 points = RM 1 of redemption value.
const POINTS_REDEMPTION_RATE = 100

export function calculatePointsEarned(amountPaid: number): number {
  return Math.floor(amountPaid * POINTS_EARNED_PER_RM)
}

export function pointsToValue(points: number): number {
  return points / POINTS_REDEMPTION_RATE
}
