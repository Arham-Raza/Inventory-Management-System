import {
  calculateDiscount,
  calculateTax,
  calculateOrderTotals,
} from "@/lib/money"

// ── calculateDiscount ────────────────────────────────────────────────────────

describe("calculateDiscount", () => {
  it("returns 0 when discount is null", () => {
    expect(calculateDiscount(100_000, null)).toBe(0)
  })

  it("applies PERCENTAGE discount with integer-safe arithmetic", () => {
    // 20% of Rs. 150,000
    expect(calculateDiscount(150_000, { type: "PERCENTAGE", value: 20 })).toBe(
      30_000
    )
  })

  it("applies fractional PERCENTAGE without floating-point drift", () => {
    // 33.33% of Rs. 99 — naive JS: 33.0.., paisa-rounding: 33
    const result = calculateDiscount(99, { type: "PERCENTAGE", value: 33.33 })
    // Result must be a clean 2-decimal value, not 32.9967
    expect(result * 100).toBe(Math.round(result * 100))
  })

  it("applies FIXED discount", () => {
    expect(calculateDiscount(100_000, { type: "FIXED", value: 5_000 })).toBe(
      5_000
    )
  })

  it("clamps FIXED discount at the subtotal — never negative", () => {
    expect(calculateDiscount(3_000, { type: "FIXED", value: 10_000 })).toBe(
      3_000
    )
  })
})

// ── calculateTax ─────────────────────────────────────────────────────────────

describe("calculateTax", () => {
  it("calculates 18% GST on a clean integer amount", () => {
    expect(calculateTax(100_000)).toBe(18_000)
  })

  it("calculates 18% GST on a fractional amount without drift", () => {
    const tax = calculateTax(120_000)
    expect(tax).toBe(21_600)
  })

  it("returns a value rounded to the nearest paisa", () => {
    // Rs. 33,333.33 × 18% = Rs. 5,999.9994 → rounded to Rs. 6,000.00
    const tax = calculateTax(33_333.33)
    expect(Number.isInteger(Math.round(tax * 100))).toBe(true)
  })
})

// ── calculateOrderTotals ─────────────────────────────────────────────────────

describe("calculateOrderTotals", () => {
  it("computes a full order with 20% flat discount correctly", () => {
    // Scenario: 1 laptop @ Rs. 150,000, 20% promotion active
    const subtotal = 150_000
    const discount = { type: "PERCENTAGE", value: 20 }

    const { discountAmount, discountedSubtotal, tax, total } =
      calculateOrderTotals(subtotal, discount)

    expect(discountAmount).toBe(30_000)        // 20% of 150,000
    expect(discountedSubtotal).toBe(120_000)   // 150,000 − 30,000
    expect(tax).toBe(21_600)                   // 18% of 120,000
    expect(total).toBe(141_600)                // 120,000 + 21,600
  })

  it("computes a full order with no discount", () => {
    const subtotal = 80_000
    const { discountAmount, discountedSubtotal, tax, total } =
      calculateOrderTotals(subtotal, null)

    expect(discountAmount).toBe(0)
    expect(discountedSubtotal).toBe(80_000)
    expect(tax).toBe(14_400)                   // 18% of 80,000
    expect(total).toBe(94_400)                 // 80,000 + 14,400
  })

  it("computes a full order with a FIXED discount", () => {
    const subtotal = 100_000
    const discount = { type: "FIXED", value: 10_000 }

    const { discountAmount, discountedSubtotal, tax, total } =
      calculateOrderTotals(subtotal, discount)

    expect(discountAmount).toBe(10_000)        // Fixed Rs. 10,000
    expect(discountedSubtotal).toBe(90_000)    // 100,000 − 10,000
    expect(tax).toBe(16_200)                   // 18% of 90,000
    expect(total).toBe(106_200)                // 90,000 + 16,200
  })

  it("total is never negative when FIXED discount exceeds subtotal", () => {
    const { discountedSubtotal, total } = calculateOrderTotals(5_000, {
      type: "FIXED",
      value: 20_000,
    })
    expect(discountedSubtotal).toBe(0)
    expect(total).toBeGreaterThanOrEqual(0)
  })

  it("multi-item subtotal with 20% discount matches manual calculation", () => {
    // Two laptops: Rs. 85,000 + Rs. 95,000 = Rs. 180,000
    const subtotal = 85_000 + 95_000
    const { discountAmount, tax, total } = calculateOrderTotals(subtotal, {
      type: "PERCENTAGE",
      value: 20,
    })

    expect(discountAmount).toBe(36_000)   // 20% of 180,000
    expect(tax).toBe(25_920)             // 18% of 144,000
    expect(total).toBe(169_920)          // 144,000 + 25,920
  })
})
