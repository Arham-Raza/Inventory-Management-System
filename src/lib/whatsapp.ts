// Stub — no WhatsApp provider is wired up yet (needs a Business API account,
// e.g. Meta Cloud API or Twilio; see the "Questions" for Module G in the
// Phase 2 plan). Until then this just logs, so registration/checkout never
// fail because a notification couldn't be sent.
export async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  try {
    console.log(`[whatsapp:stub] to ${phone}: ${message}`)
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error)
  }
}
