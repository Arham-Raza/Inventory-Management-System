// Without an explicit @page size, the browser print dialog defaults to
// Letter/A4 unless the printer driver happens to force its own default —
// not guaranteed across different 80mm thermal / label printer drivers.
// Injecting the exact roll/label size before printing keeps output correct
// regardless of driver defaults.
type PrintOptions = {
  bodyClass?: string
  title?: string
}

export function printAtSize(size: string, options: PrintOptions = {}) {
  const style = document.createElement("style")
  style.id = "dynamic-page-size"
  style.textContent = `@page { size: ${size}; margin: 0; }`
  document.head.appendChild(style)
  if (options.bodyClass) document.body.classList.add(options.bodyClass)

  const cleanup = () => {
    style.remove()
    if (options.bodyClass) document.body.classList.remove(options.bodyClass)
    window.removeEventListener("afterprint", cleanup)
  }
  window.addEventListener("afterprint", cleanup)

  window.print()
}

export function printElementAtSize(
  element: HTMLElement,
  size: string,
  options: PrintOptions = {}
) {
  printElementsAtSize([element], size, options)
}

// Same as printElementAtSize, but for N labels printed as one job — each
// element becomes its own 50×25mm page, one after another, so a sheet/roll
// of labels comes out in a single print dialog instead of one per item.
export function printElementsAtSize(
  elements: HTMLElement[],
  size: string,
  options: PrintOptions = {}
) {
  if (elements.length === 0) return

  const frame = document.createElement("iframe")
  frame.setAttribute("aria-hidden", "true")
  frame.style.position = "fixed"
  frame.style.right = "0"
  frame.style.bottom = "0"
  frame.style.width = "0"
  frame.style.height = "0"
  frame.style.border = "0"
  document.body.appendChild(frame)

  const printDocument = frame.contentDocument
  const printWindow = frame.contentWindow

  if (!printDocument || !printWindow) {
    frame.remove()
    printAtSize(size, options)
    return
  }

  printDocument.open()
  printDocument.write(`
    <!doctype html>
    <html>
      <head>
        <title>${options.title ?? "Barcode Label"}</title>
        <style>
          @page { size: ${size}; margin: 0; }
          html,
          body {
            margin: 0;
            padding: 0;
            background: #fff;
          }
          body {
            color: #000;
            font-family: Arial, sans-serif;
          }
          .barcode-sticker-container {
            display: flex !important;
            flex-direction: column;
            width: 50mm !important;
            height: 25mm !important;
            box-sizing: border-box;
            padding: 1.5mm;
            align-items: center;
            justify-content: center;
            background: #fff;
            color: #000;
            overflow: hidden;
          }
          .barcode-sticker-container:not(:last-child) {
            page-break-after: always;
          }
          svg {
            max-width: 47mm !important;
            max-height: 22mm !important;
          }
          .hidden {
            display: flex !important;
          }
        </style>
      </head>
      <body>${elements.map((el) => el.outerHTML).join("")}</body>
    </html>
  `)
  printDocument.close()

  const cleanup = () => {
    frame.remove()
    printWindow.removeEventListener("afterprint", cleanup)
  }
  printWindow.addEventListener("afterprint", cleanup)

  window.setTimeout(() => {
    printWindow.focus()
    printWindow.print()
    window.setTimeout(cleanup, 1000)
  }, 100)
}
