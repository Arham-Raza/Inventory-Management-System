import Image from "next/image"
import type { CartItem, PaymentMethod } from "./POSClient"

type ThermalReceiptProps = {
  cart: CartItem[]
  subtotal: number
  discountAmount: number
  discountName?: string
  redemptionAmount?: number
  redeemedPoints?: number
  tax: number
  total: number
  paymentMethod: PaymentMethod
  customerName?: string
  pointsEarned?: number
  newPointsBalance?: number
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH:     "Cash",
  CARD:     "Debit / Credit Card",
  TRANSFER: "Bank / Mobile Transfer",
}

export function ThermalReceipt({
  cart,
  subtotal,
  discountAmount,
  discountName,
  redemptionAmount,
  redeemedPoints,
  tax,
  total,
  paymentMethod,
  customerName,
  pointsEarned,
  newPointsBalance,
}: ThermalReceiptProps) {
  if (!cart?.length) return null

  const date = new Date().toLocaleString("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  return (
    // receipt-container is targeted by the @media print rules in globals.css
    <div className="receipt-container hidden print:block font-mono text-[11px] p-3 text-black bg-white">

      {/* ── Store header ── */}
      <div className="text-center mb-3 pb-3 border-b border-dashed border-black">
        <div className="relative w-32 h-8 mx-auto mb-1">
          <Image
            src="/images/logo.png"
            alt="TechRevalo"
            fill
            className="object-contain grayscale"
          />
        </div>
        <div className="text-[9px] tracking-wide">RENEWED PERFORMANCE. PREMIUM QUALITY.</div>
        <div className="text-[10px] mt-1">IT Hardware · Laptops · Accessories</div>
        <div className="text-[10px]">Tel: +92 300 0000000</div>
        <div className="text-[10px] mt-1 font-semibold">{date}</div>
        {customerName && (
          <div className="text-[10px] mt-1">Customer: {customerName}</div>
        )}
      </div>

      {/* ── Items ── */}
      <div className="mb-3 pb-3 border-b border-dashed border-black">
        <div className="font-bold mb-2 text-[10px] uppercase tracking-widest">
          Items Purchased
        </div>
        {cart.map((item) =>
          item.kind === "LAPTOP" ? (
            <div key={`laptop-${item.serialNumber}`} className="mb-3">
              <div className="flex justify-between font-bold">
                <span className="flex-1 pr-2 leading-snug">{item.modelName}</span>
                <span className="whitespace-nowrap">
                  RM&nbsp;{item.retailPrice.toLocaleString()}
                </span>
              </div>
              {/* Warranty-critical hardware details — all fields mandatory per the business domain */}
              <div className="text-[10px] pl-2 mt-0.5 space-y-0.5 text-gray-700">
                <div>CPU     : {item.processor}</div>
                {item.gpu && <div>GPU     : {item.gpu}</div>}
                <div>RAM     : {item.confirmedRam}</div>
                <div>Storage : {item.confirmedStorage}</div>
                <div className="font-bold tracking-wide">S/N     : {item.serialNumber}</div>
              </div>
            </div>
          ) : (
            <div key={`accessory-${item.accessoryId}`} className="mb-3">
              <div className="flex justify-between font-bold">
                <span className="flex-1 pr-2 leading-snug">{item.name}</span>
                <span className="whitespace-nowrap">
                  RM&nbsp;{(item.sellingPrice * item.quantity).toLocaleString()}
                </span>
              </div>
              <div className="text-[10px] pl-2 mt-0.5 space-y-0.5 text-gray-700">
                <div>
                  {item.quantity} × RM&nbsp;{item.sellingPrice.toLocaleString()}
                </div>
                <div className="tracking-wide">Code : {item.barcode}</div>
              </div>
            </div>
          )
        )}
      </div>

      {/* ── Totals ── */}
      <div className="space-y-1 mb-1">
        <div className="flex justify-between">
          <span>Subtotal :</span>
          <span>RM&nbsp;{subtotal.toLocaleString()}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between font-bold">
            <span>Discount{discountName ? ` (${discountName})` : ""} :</span>
            <span>-RM&nbsp;{discountAmount.toLocaleString()}</span>
          </div>
        )}
        {!!redemptionAmount && redemptionAmount > 0 && (
          <div className="flex justify-between font-bold">
            <span>Points Redeemed ({redeemedPoints} pts) :</span>
            <span>-RM&nbsp;{redemptionAmount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>GST 18% :</span>
          <span>RM&nbsp;{tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-sm border-t border-black mt-1 pt-1">
          <span>TOTAL :</span>
          <span>RM&nbsp;{total.toFixed(2)}</span>
        </div>
      </div>

      {!!pointsEarned && pointsEarned > 0 && (
        <div className="flex justify-between text-[10px] border-t border-dashed border-black pt-2 mt-2">
          <span>Points Earned :</span>
          <span>+{pointsEarned} (Balance: {newPointsBalance})</span>
        </div>
      )}

      {/* Payment method */}
      <div className="flex justify-between text-[10px] border-t border-dashed border-black pt-2 mt-2 font-semibold">
        <span>Paid by :</span>
        <span>{PAYMENT_LABELS[paymentMethod]}</span>
      </div>

      {/* ── Warranty + footer ── */}
      <div className="text-center text-[10px] border-t border-dashed border-black pt-3 mt-3 space-y-1 leading-relaxed">
        <div className="font-bold text-[11px] tracking-wide">
          ★ WARRANTY DOCUMENT ★
        </div>
        <div>All laptops carry a 1-year limited hardware warranty.</div>
        <div>Returns accepted within 7 days with original receipt.</div>
        <div>Warranty void if S/N sticker is removed or tampered.</div>
        <div className="mt-2 font-semibold">Thank you for choosing TechRevalo!</div>
      </div>
    </div>
  )
}
