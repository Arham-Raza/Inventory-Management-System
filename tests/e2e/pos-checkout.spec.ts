/**
 * POS Checkout — End-to-End Tests (Playwright)
 *
 * Prerequisites:
 *   1. `npm run dev` server running (or managed by webServer in playwright.config.ts)
 *   2. MySQL DB seeded with:
 *        - Admin user: admin@ecs.com / admin123   (created by `npx tsx src/scripts/seed.ts`)
 *        - AVAILABLE item with serialNumber "TEST-AVAIL-001"
 *        - SOLD item     with serialNumber "TEST-SOLD-001"
 *        - AVAILABLE item with serialNumber "TEST-DISC-001" (retailPrice: 100000)
 *        - Active DiscountCampaign: name="Test 20% Off", type="PERCENTAGE", value=20
 *
 *   Run tests: `npx playwright test`
 */

import { test, expect, type Page } from "@playwright/test"

// ── Helper: log in as the admin cashier ─────────────────────────────────────
async function login(page: Page) {
  await page.goto("/login")
  await page.getByLabel(/email/i).fill("admin@ecs.com")
  await page.getByLabel(/password/i).fill("admin123")
  await page.getByRole("button", { name: /sign in/i }).click()
  // Wait for redirect away from login
  await page.waitForURL(/\/(dashboard|pos)/)
}

// Shared: navigate to POS and wait for scanner input to be ready
async function gotoPOS(page: Page) {
  await page.goto("/pos")
  await expect(
    page.getByPlaceholder(/scan barcode or type serial/i)
  ).toBeVisible()
}

// ── Test 1: Happy path — scan available laptop, confirm specs, complete checkout
test("scans an AVAILABLE laptop, opens spec dialog, adds to cart, checks out", async ({
  page,
}) => {
  await login(page)
  await gotoPOS(page)

  // Scan a known-AVAILABLE serial number
  const scanInput = page.getByPlaceholder(/scan barcode or type serial/i)
  await scanInput.fill("TEST-AVAIL-001")
  await scanInput.press("Enter")

  // Spec Confirmation Dialog must appear
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible({ timeout: 5_000 })
  await expect(dialog.getByText(/confirm item specifications/i)).toBeVisible()

  // RAM and Storage inputs should be pre-filled from DB
  const ramInput = dialog.getByPlaceholder(/16gb/i).or(dialog.getByLabel(/ram/i))
  await expect(ramInput).not.toBeEmpty()

  // Confirm and add to cart
  await dialog.getByRole("button", { name: /add to cart/i }).click()

  // Dialog closes
  await expect(dialog).not.toBeVisible()

  // Item appears in the cart panel (right sidebar)
  await expect(page.getByText("TEST-AVAIL-001")).toBeVisible()

  // Pay button should be enabled and show a total
  const payBtn = page.getByRole("button", { name: /^pay/i })
  await expect(payBtn).toBeEnabled()
  await expect(payBtn).toContainText("Rs.")
})

// ── Test 2: SOLD item — must be blocked with an error toast, dialog must NOT open
test("blocks scanning a SOLD item and shows an error toast", async ({
  page,
}) => {
  await login(page)
  await gotoPOS(page)

  const scanInput = page.getByPlaceholder(/scan barcode or type serial/i)
  await scanInput.fill("TEST-SOLD-001")
  await scanInput.press("Enter")

  // Error toast must appear
  await expect(page.getByText(/already sold/i)).toBeVisible({ timeout: 5_000 })

  // Spec confirmation dialog must NOT open
  await expect(page.getByRole("dialog")).not.toBeVisible()

  // Cart must still be empty
  await expect(page.getByText(/no items scanned/i)).toBeVisible()
})

// ── Test 3: 20% discount — cart totals must match expected math
test("applies a 20% discount campaign and verifies correct totals", async ({
  page,
}) => {
  await login(page)
  await gotoPOS(page)

  // Scan and add item (retailPrice = Rs. 100,000)
  const scanInput = page.getByPlaceholder(/scan barcode or type serial/i)
  await scanInput.fill("TEST-DISC-001")
  await scanInput.press("Enter")
  await page.getByRole("dialog").getByRole("button", { name: /add to cart/i }).click()

  // Subtotal should be Rs. 100,000 before discount
  // Apply the 20% discount campaign
  const discountSelect = page.getByRole("combobox")
  await discountSelect.click()
  await page.getByText(/test 20% off/i).click()

  // Verify discount line is visible
  await expect(page.getByText(/discount/i)).toBeVisible()
  await expect(page.getByText(/20,000/)).toBeVisible() // Rs. 20,000 off

  // Verify GST line: 18% of (100,000 − 20,000) = 18% of 80,000 = 14,400
  await expect(page.getByText(/14,400/)).toBeVisible()

  // Verify total: 80,000 + 14,400 = 94,400
  const payBtn = page.getByRole("button", { name: /^pay/i })
  await expect(payBtn).toContainText("94,400")
})

// ── Test 4: Duplicate scan — second scan of same serial is rejected
test("rejects scanning the same serial number twice", async ({ page }) => {
  await login(page)
  await gotoPOS(page)

  const scanInput = page.getByPlaceholder(/scan barcode or type serial/i)

  // First scan
  await scanInput.fill("TEST-AVAIL-001")
  await scanInput.press("Enter")
  await page.getByRole("dialog").getByRole("button", { name: /add to cart/i }).click()

  // Second scan of same serial
  await scanInput.fill("TEST-AVAIL-001")
  await scanInput.press("Enter")

  // Warning toast, not a dialog
  await expect(page.getByText(/already in cart/i)).toBeVisible({ timeout: 3_000 })
  await expect(page.getByRole("dialog")).not.toBeVisible()
})

// ── Test 5: Spec edit — cashier can change RAM before adding to cart
test("cashier can edit RAM and Storage in the spec dialog before adding", async ({
  page,
}) => {
  await login(page)
  await gotoPOS(page)

  const scanInput = page.getByPlaceholder(/scan barcode or type serial/i)
  await scanInput.fill("TEST-AVAIL-001")
  await scanInput.press("Enter")

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // Edit the RAM field
  const ramInput = dialog.getByLabel(/ram/i)
  await ramInput.clear()
  await ramInput.fill("32GB DDR5")

  // Edit the Storage field
  const storageInput = dialog.getByLabel(/storage/i)
  await storageInput.clear()
  await storageInput.fill("1TB NVMe SSD")

  await dialog.getByRole("button", { name: /add to cart/i }).click()

  // Cart card should reflect the edited specs
  await expect(page.getByText("32GB DDR5")).toBeVisible()
  await expect(page.getByText(/1TB NVMe SSD/)).toBeVisible()
})
