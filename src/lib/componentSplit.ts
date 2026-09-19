// Splits a laptop's bundled retail price into laptop/RAM/storage revenue
// lines when the confirmed spec at checkout differs from what it was
// stocked in with. The total charged to the customer never changes — this
// is purely an internal re-attribution so the laptop's own margin isn't
// inflated or deflated by a component it no longer ships with.
//
// Each confirmed component is priced at its own component-price-list value
// (if one exists); the laptop line absorbs whatever's left of the bundled
// retail price. A component with no price-list entry is left unsplit — its
// value stays folded into the laptop line rather than guessed at.

export type ComponentPriceLookup = (type: "RAM" | "STORAGE", label: string) => number | null

export type ComponentSplitResult = {
  laptopPrice: number
  ramPrice: number | null
  storagePrice: number | null
  // Whether the confirmed spec differs from what the unit was stocked in
  // with — independent of whether either side happens to have a price-list
  // entry. The caller uses this to decide whether the original component
  // needs to be routed to spare-parts stock.
  ramChanged: boolean
  storageChanged: boolean
}

export function splitComponentPrice(
  retailPrice: number,
  originalRam: string,
  originalStorage: string,
  confirmedRam: string,
  confirmedStorage: string,
  priceOf: ComponentPriceLookup
): ComponentSplitResult {
  const ramChanged = confirmedRam.trim() !== originalRam.trim()
  const storageChanged = confirmedStorage.trim() !== originalStorage.trim()

  const ramPrice = ramChanged ? priceOf("RAM", confirmedRam) : null
  const storagePrice = storageChanged ? priceOf("STORAGE", confirmedStorage) : null

  const claimed = (ramPrice ?? 0) + (storagePrice ?? 0)
  const laptopPrice = Math.max(0, retailPrice - claimed)

  return { laptopPrice, ramPrice, storagePrice, ramChanged, storageChanged }
}
