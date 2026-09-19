# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TechRevalo POS is a Point of Sale and inventory management system for TechRevalo (renewed/refurbished computer hardware & laptop retail — "Renewed Performance. Premium Quality."). Built with Next.js App Router, Prisma ORM, and MySQL. Internal identifiers (npm scripts referencing the old `ecs_pos_db` database name, seeded account emails like `admin@ecs.com`) were kept as-is during the TechRevalo rebrand since changing them would touch live auth/DB config — only user-facing branding (logo, colors, page copy, receipt) was updated.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint

# Tests — no npm script wrappers exist yet; invoke the runners directly
npx jest                                  # Jest unit tests
npx jest --watch                          # Jest watch mode
npx jest --coverage                       # Jest coverage
npx playwright test                       # Playwright E2E (requires running dev server + test seed data)
npx playwright test --ui                  # Playwright interactive mode

# Database
npx prisma migrate dev        # Apply schema migrations (run after every schema change)
npx prisma db push            # Push schema without migration history
npx tsx src/scripts/seed.ts   # Seed 4 role accounts (see below) — idempotent upsert, safe to rerun
```

`src/scripts/seed.ts` seeds one user per role: `admin@ecs.com`/`admin123` (SUPER_ADMIN), `manager@ecs.com`/`manager123` (MANAGER), `dataentry@ecs.com`/`dataentry123` (DATA_ENTRY), `cashier@ecs.com`/`cashier123` (CASHIER). There is also a `prisma/seed.ts` which only creates the admin user — prefer `src/scripts/seed.ts`, it's the one referenced by E2E setup.

## Environment Setup

Requires MySQL. Relevant `.env` variables:
- `DATABASE_URL` — e.g. `mysql://root:@localhost:3306/ecs_pos_db`
- `NEXTAUTH_SECRET` / `AUTH_SECRET` — JWT signing key
- `NEXTAUTH_URL` — auth callback base URL
- `AUTH_TRUST_HOST` — set `true` for localhost dev

## Architecture

### Route Groups

| Route | Access | Description |
|---|---|---|
| `(admin)` | Role-gated per route | Dashboard, Inventory, Data Entry, Accounting, Discounts, Employees |
| `/dashboard`, `/inventory` | SUPER_ADMIN, MANAGER | KPIs and stock |
| `/data-entry` | DATA_ENTRY only (redirect target for this role) | Inventory intake |
| `/component-prices` | SUPER_ADMIN, MANAGER, DATA_ENTRY | The one exception to DATA_ENTRY's `/data-entry`-only lock — see `src/proxy.ts` |
| `/accounting`, `/discounts`, `/employees` | SUPER_ADMIN only | MANAGER is redirected away |
| `(pos)` | CASHIER (redirect target for this role) | POS terminal at `/pos` |
| `/login` | Public | NextAuth credentials form |
| `/api/auth/[...nextauth]` | Public | NextAuth handler |

### Route Protection

`src/proxy.ts` is the single route-protection file. Next.js 16 renamed the
`middleware` file convention to `proxy` (old convention is deprecated, see
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`).
Wraps `auth()` from `@/auth`, default-exported. Its matcher excludes `/api`.

There used to be a second, stale `middleware.ts` at the repo root reimplementing
the same RBAC logic independently via `getToken()`, with a different matcher and
slightly different allowed-path rules. It was assumed to be dead code under the
`proxy` convention — it was not: it was still executing and silently overriding
`proxy.ts` (caught when a DATA_ENTRY exception added to `proxy.ts` had no effect
until `middleware.ts` was deleted). It has been removed. If page-level RBAC edits
to `proxy.ts` ever appear to have no effect again, check for a live root-level
`middleware.ts` before assuming the edit itself is wrong.

Route-level access is enforced only by `proxy.ts` — `(admin)/layout.tsx` and
`(data-entry)/layout.tsx` should stay limited to `if (!session) redirect("/login")`
plus, at most, a CASHIER redirect; per-path role decisions belong in `proxy.ts`,
which has the pathname to check against and layouts don't.

### Data Flow

Server actions in `src/actions/` are the only mutation path. No REST API layer (the only route under `src/app/api/` is the NextAuth handler).

```
Client Component → Server Action (auth() check → Prisma $transaction) → revalidatePath()
```

### Key Files

| Path | Purpose |
|---|---|
| `src/auth.ts` | NextAuth config — credentials provider, JWT with role + id claims |
| `src/proxy.ts` | Sole route-protection file (see Route Protection note above) |
| `src/lib/prisma.ts` | Prisma singleton (dev HMR safe) |
| `src/lib/money.ts` | Integer-based (paisa) financial math — discount, tax, total |
| `src/actions/order.ts` | `createOrder` — full `$transaction`, concurrency guard, server-side pricing |
| `src/actions/pos.ts` | `lookupInventoryItem` — returns Decimal as number |
| `src/actions/dashboard.ts` | `getDashboardStats` — aggregated KPIs for dashboard |
| `src/components/pos/POSClient.tsx` | Main POS terminal — exports `CartItem`, `PaymentMethod` types |
| `src/components/pos/ThermalReceipt.tsx` | 80mm thermal receipt, imports types from POSClient |
| `src/components/layout/Sidebar.tsx` | Dark sidebar with role-filtered nav + user info strip |
| `src/hooks/useBarcodeScanner.ts` | Global hardware scanner hook (stable-ref, idle-flush) |
| `prisma/schema.prisma` | Full DB schema |

### Database Models

- **`InventoryItem`** — Each physical laptop is a unique record keyed by `serialNumber`. Has `gpu` (base spec). `ram`/`storage` are confirmed + updated at checkout.
- **`Order` / `OrderItem`** — `priceAtSale` is snapshotted from DB at transaction time (never from client).
- **`DiscountCampaign`** — `PERCENTAGE` or `FIXED`. Must convert `value` (Decimal) with `Number()` before rendering.
- **`User`** — Roles: `SUPER_ADMIN`, `MANAGER`, `DATA_ENTRY`, `CASHIER`.

> **Decimal rule**: All monetary DB fields are `Decimal @db.Decimal(10,2)`. Always wrap with `Number()` before JavaScript arithmetic or rendering: `Number(item.retailPrice).toLocaleString()`.

### Concurrency Protection (`src/actions/order.ts`)

The critical guard is a conditional `updateMany` inside `prisma.$transaction`:

```typescript
await tx.inventoryItem.updateMany({
  where: { serialNumber: sn, status: "AVAILABLE" },  // atomic guard
  data:  { status: "SOLD", orderItemId: orderItem.id },
})
// result.count === 0 → already sold by another cashier → throw → full rollback
```

### Serialized Asset Tracking (Core Business Rule)

1. Cashier scans barcode → `lookupInventoryItem` checks DB
2. **Spec Confirmation Dialog** opens — locked: model/CPU/GPU; editable: RAM/Storage
3. Cashier explicitly clicks "Add to Cart" — confirmed specs are stored to cart and persisted to DB + receipt
4. On checkout, `createOrder` uses DB prices (not client values) and runs the atomic concurrency guard

### Financial Math (`src/lib/money.ts`)

All arithmetic uses **paisa** (1 Rs = 100 paisa) internally to eliminate drift:
- `TAX_RATE_PERCENT = 18` — single source of truth for GST
- `calculateOrderTotals(subtotal, discount)` returns `{ discountAmount, discountedSubtotal, tax, total }`
- `formatRs(amount)` — locale-formatted display string

### POS Payment Methods

`PaymentMethod = "CASH" | "CARD" | "TRANSFER"` (state in POSClient only; not currently stored in DB).

- PAY button color changes: green (Cash), blue (Card), violet (Transfer)
- Payment method is printed on the thermal receipt

### UI Screen Summary

| Screen | File | Notable |
|---|---|---|
| Login | `app/login/` | Split-screen: dark brand panel (left) + white form (right) |
| Dashboard | `app/(admin)/dashboard/page.tsx` | Live KPIs from `getDashboardStats` |
| Inventory | `app/(admin)/inventory/page.tsx` | GPU column; Decimal wrapped with `Number()` |
| Discounts | `app/(admin)/discounts/page.tsx` | Decimal wrapped with `Number()` |
| POS | `components/pos/POSClient.tsx` | Spec dialog + payment method selector |

### Testing

- **Unit**: `src/__tests__/cart-calculations.test.ts` — pure math for `src/lib/money.ts` (Jest, jsdom, config in `jest.config.ts`)
- **E2E**: `tests/e2e/pos-checkout.spec.ts` — requires seeded items `TEST-AVAIL-001`, `TEST-SOLD-001`, `TEST-DISC-001` (Playwright, config in `playwright.config.ts`, auto-starts `npm run dev` if not already running)

> **Next.js 16.x note**: APIs may differ from standard docs — check `node_modules/next/dist/docs/` when behaviour is unexpected. Confirmed example: `middleware` → `proxy` file convention rename (see Route Protection above).
