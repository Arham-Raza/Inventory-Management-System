"use client"

import { useEffect, useRef } from "react"

// Time budget between consecutive keystrokes for scanner mode.
// Hardware scanners typically fire characters < 10 ms apart.
// 100 ms gives plenty of headroom without catching deliberate typing.
const SCANNER_GAP_MS = 100

// Minimum character count before we treat the buffer as a real barcode.
const MIN_BARCODE_LENGTH = 4

// If no Enter arrives and no keystroke occurs for this long, auto-flush the buffer
// (handles the rare scanner that omits the trailing Enter).
const IDLE_FLUSH_MS = 200

export function useBarcodeScanner(onScan: (barcode: string) => void) {
  // Stable ref pattern: the event listener is registered once (empty dep array)
  // but always calls the latest version of onScan without re-registration.
  const onScanRef = useRef(onScan)
  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    let buffer = ""
    let lastKeyTime = 0
    let flushTimer: ReturnType<typeof setTimeout> | null = null

    const flush = () => {
      if (flushTimer) {
        clearTimeout(flushTimer)
        flushTimer = null
      }
      if (buffer.length >= MIN_BARCODE_LENGTH) {
        onScanRef.current(buffer)
      }
      buffer = ""
      lastKeyTime = 0
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore all input while the user is inside any focusable text control
      const target = e.target as HTMLElement
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable
      ) {
        return
      }

      // Ignore modified keys (Ctrl+C, Alt+Tab, etc.)
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const now = Date.now()

      // Gap too large → this is manual typing, not a scanner; reset buffer
      if (lastKeyTime !== 0 && now - lastKeyTime > SCANNER_GAP_MS) {
        buffer = ""
      }

      // Clear pending idle-flush so it doesn't fire mid-scan
      if (flushTimer) {
        clearTimeout(flushTimer)
        flushTimer = null
      }

      lastKeyTime = now

      if (e.key === "Enter") {
        flush()
      } else if (e.key.length === 1) {
        // Only printable single characters (excludes Shift, F1, ArrowUp, etc.)
        buffer += e.key

        // Schedule an idle flush in case the scanner omits the trailing Enter
        flushTimer = setTimeout(flush, IDLE_FLUSH_MS)
      }
      // Non-printable keys (Shift, Backspace, etc.) are silently ignored
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (flushTimer) clearTimeout(flushTimer)
    }
  }, []) // Intentionally empty: listener is stable; callback accessed via ref
}
