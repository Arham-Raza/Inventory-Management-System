// Without an explicit @page size, the browser print dialog defaults to
// Letter/A4 unless the printer driver happens to force its own default —
// not guaranteed across different 80mm thermal / label printer drivers.
// Injecting the exact roll/label size before printing keeps output correct
// regardless of driver defaults.
export function printAtSize(size: string) {
  const style = document.createElement("style")
  style.id = "dynamic-page-size"
  style.textContent = `@page { size: ${size}; margin: 0; }`
  document.head.appendChild(style)

  const cleanup = () => {
    style.remove()
    window.removeEventListener("afterprint", cleanup)
  }
  window.addEventListener("afterprint", cleanup)

  window.print()
}
