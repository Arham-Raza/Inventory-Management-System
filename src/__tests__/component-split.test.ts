import { splitComponentPrice } from "@/lib/componentSplit"

describe("splitComponentPrice", () => {
  it("keeps the full price on the laptop line when nothing changed", () => {
    const result = splitComponentPrice(
      800,
      "512GB SSD",
      "512GB SSD",
      "512GB SSD",
      "512GB SSD",
      () => 100
    )
    expect(result).toEqual({
      laptopPrice: 800,
      ramPrice: null,
      storagePrice: null,
      ramChanged: false,
      storageChanged: false,
    })
  })

  it("re-splits a downgraded storage spec, leaving the total unchanged", () => {
    // Matches the client's own example: Rs 800 bundle, sold with 256GB
    // instead of the stocked 512GB — laptop absorbs the remainder.
    const priceOf = (type: "RAM" | "STORAGE", label: string) =>
      type === "STORAGE" && label === "256GB" ? 100 : null

    const result = splitComponentPrice(800, "16GB", "512GB", "16GB", "256GB", priceOf)

    expect(result.storagePrice).toBe(100)
    expect(result.ramPrice).toBeNull()
    expect(result.laptopPrice).toBe(700) // 800 - 100
    expect(result.storageChanged).toBe(true)
    expect(result.ramChanged).toBe(false)
  })

  it("splits both RAM and storage when both change", () => {
    const priceOf = (type: "RAM" | "STORAGE", label: string) => {
      if (type === "RAM" && label === "8GB") return 120
      if (type === "STORAGE" && label === "256GB") return 100
      return null
    }

    const result = splitComponentPrice(800, "16GB", "512GB", "8GB", "256GB", priceOf)

    expect(result.ramPrice).toBe(120)
    expect(result.storagePrice).toBe(100)
    expect(result.laptopPrice).toBe(580) // 800 - 120 - 100
    expect(result.ramChanged).toBe(true)
    expect(result.storageChanged).toBe(true)
  })

  it("leaves an unpriced swap folded into the laptop line, but still flags it changed", () => {
    // Confirmed spec changed but no price-list entry exists for it —
    // don't guess at the revenue split, but the caller still needs to know
    // a swap happened (e.g. to route the original part to spare stock).
    const result = splitComponentPrice(800, "16GB", "512GB", "32GB", "512GB", () => null)

    expect(result.ramPrice).toBeNull()
    expect(result.laptopPrice).toBe(800)
    expect(result.ramChanged).toBe(true)
  })

  it("never lets the laptop line go negative when components outprice the bundle", () => {
    const result = splitComponentPrice(100, "8GB", "256GB", "64GB", "2TB", () => 200)
    expect(result.laptopPrice).toBe(0)
  })
})
