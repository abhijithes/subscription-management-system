# Subscription Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Brightloop subscription platform: catalog, quotations, subscriptions, idempotent billing, invoices, payments, customer portal and finance dashboard.

**Architecture:** A modular monolith in Next.js. Pure rule functions in `src/lib/` (money, pricing, discounts, status, periods, passwords) are unit-tested without a database. Services in `src/server/services/` own all business logic and database access. Pages and server actions only call services after `requireRole()`.

**Tech Stack:** Next.js 16.4.3 (App Router), React 19.3, TypeScript, Prisma, Supabase Postgres, Clerk, Tailwind 4 and shadcn/ui, Zod, Vitest, Resend.

**Spec:** `docs/superpowers/specs/2026-10-31-subscription-management-design.md`

## Global Constraints

- Next.js in this repo has breaking changes. Before writing any Next code, read the relevant guide in `node_modules/next/dist/docs/` (see `AGENTS.md`). Check the file name for request interception: it may be `proxy.ts`, not `middleware.ts`.
- Passwords: minimum length 9, with an uppercase letter, a lowercase letter and a special character (AUTH-03, BR-02).
- Money is `decimal(12,2)` with Prisma Decimal, never floats. Round per line. Invoice total is the sum of the lines.
- Discount applies first, then tax on the post-discount amount. `minPurchase` is checked against the pre-tax subtotal.
- Invoice unique key is `(subscriptionId, periodStart, revision)`. The run skips a period if any revision exists. `invoiceDate = periodStart`. `dueDate = invoiceDate + paymentTermsDays`.
- Statuses: Subscription DRAFT, QUOTATION, CONFIRMED, ACTIVE, CLOSED moving forward only. Invoice DRAFT, CONFIRMED, PAID. Pause is the `isPaused` flag.
- Billing chunk size 50, ordered by id with a cursor. List page size 25.
- A Customer asking for another customer's record gets 404, not 403.
- Only the backend talks to the database. Every server action and route handler starts with `requireRole(...)`.
- Server actions return `{ ok: true, data }` or `{ ok: false, fieldErrors, message }`.
- Env vars: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `RESEND_API_KEY` (optional), `BILLING_CRON_SECRET`, `APP_URL`.
- Out of scope: invoice cancel and partial payments.
- Git: `main` is the source of truth. Commits are local. Never push, and never change anything on the remote, without the user's explicit permission. Never commit `.env*`. Never add `CLAUDE.md` to a commit or PR.

## Review Focus

Inputs the spec implies but does not spell out. Each has a test in the task named in brackets.

1. Monthly period arithmetic from a month-end start (Jan 31): periods must be Jan 31, Feb 28 (29 in a leap year), Mar 31, not drifting to the 28th [Task 2].
2. A fixed discount larger than the subtotal: the discount clamps to the subtotal and the total is never negative [Task 2].
3. A subscription with no lines: the run reports it as failed with a reason and creates no invoice [Task 8].
4. Sign-up emails differing only by case (`A@x.com` and `a@x.com`): same account [Task 4].
5. Recording a payment whose amount differs from the invoice total (including `100.1` vs `100.10`): equal decimals are accepted, any difference is rejected [Task 9].

## Dependencies

Task 1, then 2 and 3 (parallel), then 4, then 5. Then 6 and 7 (parallel). Task 8 needs 7, task 9 needs 8. Tasks 10 and 11 need 9. Task 12 needs 8 to 11. Task 13 last.

## File Structure

```
prisma/schema.prisma, migrations/, seed.ts
src/lib/{money,pricing,discount,status,period,password,errors}.ts   pure rules (+ .test.ts beside each)
src/lib/validation/{catalog,subscription,payment,staff}.ts          Zod schemas
src/server/db.ts, email.ts
src/server/auth/{current-user,require-role}.ts
src/server/services/{catalog,subscriptions,billing,invoices,payments,portal,dashboard}.ts
src/components/{app-shell,nav,data-table}.tsx and ui/ (shadcn)
src/app/(app)/...   staff and admin pages      src/app/portal/...   customer pages
tests/integration/   real-Postgres tests
```

---

### Task 1: Tooling

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`, `.env.example`, `tests/integration/setup.ts`

**Interfaces:**
- Produces: scripts `test` (unit, `src/**/*.test.ts`), `test:integration` (`tests/integration/**/*.test.ts`, runs against `TEST_DATABASE_URL`), `db:seed`.

- [ ] **Step 1:** Run `pnpm add prisma@^7.10.1 @prisma/client@^7.10.1 @prisma/adapter-pg pg zod @clerk/nextjs resend` and `pnpm add -D vitest tsx dotenv @types/pg @types/node@^22`, then read the Next docs named in Global Constraints.
- [ ] **Step 2:** Create `vitest.config.ts` with two projects (unit, integration) and add the scripts. Create `.env.example` listing every env var above plus `TEST_DATABASE_URL`.
- [ ] **Step 3:** Run `pnpm run test --passWithNoTests && pnpm run typecheck && pnpm run lint`. Expected: all exit 0.
- [ ] **Step 4:** Commit locally: `chore: add test tooling and env example`.

### Task 2: Pure rule library

**Files:**
- Create: `src/lib/{money,pricing,discount,status,period,password,errors}.ts` and a `.test.ts` for each.

**Interfaces:**
- Produces (Decimal is `Prisma.Decimal`):
  - `errors.ts`: `class RuleError extends Error { code: 'VALIDATION'|'FORBIDDEN'|'NOT_FOUND'|'ILLEGAL_TRANSITION' }`, `type ActionResult<T>`.
  - `money.ts`: `toMoney(v: string|number|Decimal): Decimal`, `round2(d: Decimal): Decimal` (half up), `sumMoney(ds: Decimal[]): Decimal`.
  - `pricing.ts`: `linePrice(salesPrice: Decimal, variantExtra: Decimal|null): Decimal`; `type LineInput = { productId: string; description: string; quantity: number; unitPrice: Decimal; taxName: string|null; taxRatePercent: Decimal }`; `type AppliedDiscount = { ruleId: string; type: 'FIXED'|'PERCENT'; value: Decimal; appliesTo: 'PRODUCT'|'SUBSCRIPTION'; productId: string|null }`; `type PricedLine = LineInput & { discount: Decimal; net: Decimal; tax: Decimal; amount: Decimal }`; `priceInvoice(lines: LineInput[], discount: AppliedDiscount|null): { lines: PricedLine[]; subtotal: Decimal; discountTotal: Decimal; taxTotal: Decimal; total: Decimal }`.
  - `discount.ts`: `type RuleLike` (the `DiscountRule` fields from the spec); `rankEligibleRules(rules: RuleLike[], lines: LineInput[], invoiceDate: Date): { rule: RuleLike; saving: Decimal }[]`, best first.
  - `status.ts`: `canTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean`; `assertPlanAllows(action: 'pause'|'close'|'renew', plan: { allowPause: boolean; allowEarlyClose: boolean; allowRenew: boolean }): void`; `canRecordPayment(status: InvoiceStatus): boolean`.
  - `period.ts`: `addPeriod(start: Date, period: BillingPeriod, n: number): Date`, UTC date-only, always computed from the original `start` plus `n` periods.
  - `password.ts`: `validatePassword(pw: string): string[]` (one message per violated rule, empty when valid).

- [ ] **Step 1: Write the failing tests**
  - `pricing.test.ts`: `linePrice(toMoney('1000'), toMoney('560'))` equals `1560`; two lines at `10.00` with a SUBSCRIPTION FIXED `0.01` discount have line discounts summing to exactly `0.01` and `total` equal to the sum of line amounts; a PRODUCT rule only discounts matching lines; tax is `rate` of the post-discount net (100.00 at 10% with 10% PERCENT discount gives tax 9.00, total 99.00); a FIXED `1000` discount on a `500` subtotal gives `discountTotal` 500 and `total` 0 (Review Focus 2).
  - `discount.test.ts`: rules outside dates, below `minPurchase` (pre-tax), below `minQuantity` or with `usedCount >= usageLimit` are excluded; of two eligible rules the larger saving ranks first; equal savings rank by earlier `endsAt`, then lower id.
  - `status.test.ts`: DRAFT to QUOTATION is allowed, QUOTATION to DRAFT and ACTIVE to CONFIRMED are not, DRAFT to ACTIVE (skipping) is not; `assertPlanAllows('pause', { allowPause: false, ... })` throws `RuleError` with code `ILLEGAL_TRANSITION`; `canRecordPayment` is true only for CONFIRMED.
  - `period.test.ts`: MONTHLY from `2026-01-31`: n=1 gives `2026-02-28`, n=2 gives `2026-03-31`; a leap year gives `2028-02-29`; DAILY n=3, WEEKLY n=2, YEARLY n=1 from `2028-02-29` gives `2029-02-28` (Review Focus 1).
  - `password.test.ts`: `Abcdefg1!` (9 chars) is valid; `Abcdef1!` (8) fails length; each of missing uppercase, lowercase and special character yields a message.
  - `money.test.ts`: `round2('1.005')` is `1.01`; `sumMoney([])` is `0`.
- [ ] **Step 2:** Run `pnpm run test`. Expected: FAIL, modules not found.
- [ ] **Step 3:** Implement the signatures above. Allocate a subscription-level discount across lines proportionally, putting the rounding remainder on the last line. Clamp total discount to the subtotal.
- [ ] **Step 4:** Run `pnpm run test`. Expected: PASS.
- [ ] **Step 5:** Commit locally: `feat(lib): add money, pricing, discount, status, period and password rules`.

### Task 3: Prisma schema and database client

**Files:**
- Create: `prisma/schema.prisma`, `src/server/db.ts`, `tests/integration/schema.test.ts`
- Modify: `tests/integration/setup.ts`

**Interfaces:**
- Consumes: env `DATABASE_URL`, `DIRECT_URL`.
- Produces: models and enums exactly as spec section 4 (User, Product, ProductVariant, Plan, Tax, DiscountRule, QuotationTemplate, TemplateLine, Subscription, SubscriptionLine, Invoice, InvoiceLine, InvoiceDiscount, Payment), with the indexes listed there; `export const prisma: PrismaClient` from `src/server/db.ts`; a `resetDb(): Promise<void>` helper in `tests/integration/setup.ts`.

- [ ] **Step 1: Write the failing test** in `schema.test.ts`: creating two users with the same email rejects; two invoices with the same `(subscriptionId, periodStart, revision)` reject; the same pair with `revision: 2` succeeds; a subscription `number` duplicate rejects.
- [ ] **Step 2:** Run `pnpm run test:integration`. Expected: FAIL, no schema.
- [ ] **Step 3:** Write `schema.prisma` with `decimal(12,2)` money fields, then run `pnpm exec prisma migrate dev --name init` against the test database. Use `DIRECT_URL` for migrations. Add the singleton client with the usual dev hot-reload guard.
- [ ] **Step 4:** Run `pnpm run test:integration`. Expected: PASS.
- [ ] **Step 5:** Commit locally: `feat(db): add Prisma schema, initial migration and client`.

### Task 4: Authentication and roles

**Files:**
- Create: `src/server/auth/{current-user,require-role}.ts`, `src/lib/validation/staff.ts`, the Clerk request-interception file (name per the Next docs), `src/app/sign-in/[[...sign-in]]/page.tsx`, `src/app/sign-up/[[...sign-up]]/page.tsx`, `src/app/forgot-password/page.tsx`, `src/app/team/page.tsx`, `src/app/team/actions.ts`, `tests/integration/auth.test.ts`
- Modify: `src/app/layout.tsx` (ClerkProvider)

**Interfaces:**
- Consumes: `prisma`, `RuleError`, `validatePassword`.
- Produces: `getCurrentUser(): Promise<User|null>` (upserts a CUSTOMER row by `clerkUserId`, lowercasing the email); `requireRole(...roles: Role[]): Promise<User>` (redirects signed-out users, throws `RuleError('FORBIDDEN')` for the wrong role); `createStaff(input: { email: string; name: string; password: string }): Promise<ActionResult<{ userId: string }>>` (ADMIN only, calls Clerk's backend API, then inserts a STAFF row); `homePathFor(role: Role): string`.

- [ ] **Step 1: Write the failing tests** in `auth.test.ts` (Clerk calls mocked): first call for a new Clerk user creates a CUSTOMER; a second Clerk user whose email differs only by case maps to the same row (Review Focus 4); `requireRole('ADMIN')` throws `FORBIDDEN` for STAFF; `createStaff` by a STAFF user returns `ok: false`; `createStaff` with `weakpass` returns a field error on `password`; `homePathFor` returns `/dashboard` for ADMIN and STAFF and `/portal` for CUSTOMER.
- [ ] **Step 2:** Run `pnpm run test:integration auth`. Expected: FAIL.
- [ ] **Step 3:** Implement the signatures. Configure Clerk password rules in the dashboard per spec section 8 and list them in the README.
- [ ] **Step 4:** Run `pnpm run test:integration auth`. Expected: PASS. Then run `pnpm run dev` and confirm sign-up, sign-in and the reset email work in a browser.
- [ ] **Step 5:** Commit locally: `feat(auth): add Clerk auth, role guard and staff creation`.

### Task 5: App shell and navigation

**Files:**
- Create: `src/components/{app-shell,nav,data-table}.tsx`, `src/lib/nav.ts`, `src/lib/nav.test.ts`, `src/app/(app)/layout.tsx`, `src/app/portal/layout.tsx`
- Modify: `src/app/page.tsx` (redirect to `homePathFor`)

**Interfaces:**
- Consumes: `requireRole`, `homePathFor`.
- Produces: `navFor(role: Role): { label: string; href: string }[]` (routes per the spec section 7 table); `<DataTable>` accepting `columns`, `rows`, `page`, `pageSize` (25) and `total`.

- [ ] **Step 1: Write the failing test** in `nav.test.ts`: ADMIN's list contains `/products` and `/team`; STAFF's contains `/subscriptions` but neither `/products` nor `/team`; CUSTOMER's contains only `/portal` and `/portal/invoices`.
- [ ] **Step 2:** Run `pnpm run test nav`. Expected: FAIL.
- [ ] **Step 3:** Implement `navFor`, run `pnpm dlx shadcn@latest init` (confirm Tailwind 4 support in its docs first), and build the sidebar shell. It collapses to a menu on phone width, with no horizontal page scroll.
- [ ] **Step 4:** Run `pnpm run test nav && pnpm run typecheck`. Expected: PASS. Check the shell at phone width in a browser.
- [ ] **Step 5:** Commit locally: `feat(ui): add role-based app shell and navigation`.

### Task 6: Catalog (products, variants, plans, taxes, discounts)

**Files:**
- Create: `src/lib/validation/catalog.ts`, `src/server/services/catalog.ts`, pages and server actions under `src/app/(app)/{products,plans,taxes,discounts}/`, `tests/integration/catalog.test.ts`

**Interfaces:**
- Consumes: `requireRole`, `prisma`, `ActionResult`.
- Produces (all ADMIN only; each takes the input type from the matching Zod schema and returns `ActionResult<{ id: string }>`): `createProduct`, `addVariant(productId: string, input)`, `createPlan`, `createTax`, `createDiscountRule`; plus `listProducts(page: number)`, `listPlans(page: number)`, `listTaxes()`, `listDiscountRules(page: number)`.

- [ ] **Step 1: Write the failing tests:** each create function returns `ok: false` for a STAFF caller; a variant with attribute `Brand`, value `Odoo`, `extraPrice` `560` persists; a plan with `minQuantity` 0 or an `availableTo` before `availableFrom` returns field errors; a PERCENT rule with `value` above 100 or `endsAt` before `startsAt` returns field errors; a PRODUCT rule without `productId` returns a field error.
- [ ] **Step 2:** Run `pnpm run test:integration catalog`. Expected: FAIL.
- [ ] **Step 3:** Implement the Zod schemas, services and pages. Lists use server pagination, with empty and loading states.
- [ ] **Step 4:** Run `pnpm run test:integration catalog`. Expected: PASS. Check each form in the browser.
- [ ] **Step 5:** Commit locally: `feat(catalog): add products, variants, plans, taxes and discount rules`.

### Task 7: Quotation templates and subscriptions

**Files:**
- Create: `src/lib/validation/subscription.ts`, `src/server/services/subscriptions.ts`, pages and actions under `src/app/(app)/{templates,subscriptions}/`, `tests/integration/subscriptions.test.ts`

**Interfaces:**
- Consumes: `canTransition`, `assertPlanAllows`, `addPeriod`, `linePrice`, `requireRole`.
- Produces (ADMIN or STAFF): `createTemplate(input): ActionResult<{ id }>`; `createSubscriptionFromTemplate(templateId: string, customerId: string, input: { startDate: Date; expiryDate: Date; paymentTermsDays: number }): ActionResult<{ id; number }>`; `createSubscription(input)` (from scratch); `advanceStatus(subscriptionId: string, to: SubscriptionStatus): ActionResult<{ status }>` (setting ACTIVE sets `nextBillingDate = startDate`); `pauseSubscription(id)`, `resumeSubscription(id)` (sets `nextBillingDate` to today), `closeSubscription(id)`, `renewSubscription(id)` (extends `expiryDate` by `expiryDate - startDate`); `listSubscriptions(filters: { status?: SubscriptionStatus; q?: string; page: number })`.

- [ ] **Step 1: Write the failing tests:** numbers are unique and sequential across two creations; a line with quantity below the plan's `minQuantity` returns a field error (BR-09); `advanceStatus` DRAFT to ACTIVE returns `ok: false` and DRAFT to QUOTATION succeeds; a template's `quotationExpiresAt` is `validityDays` after creation; `pauseSubscription` on a plan with `allowPause: false` returns `ok: false`; resume sets `nextBillingDate` to today and `isPaused` false; `renewSubscription` extends `expiryDate` by the original duration and keeps the number; line `unitPrice` is recalculated server-side whatever the input says (BR-06).
- [ ] **Step 2:** Run `pnpm run test:integration subscriptions`. Expected: FAIL.
- [ ] **Step 3:** Implement the services and pages. `/subscriptions/[id]` shows a status stepper and only the actions the plan allows. Staff and admin can see every subscription's status.
- [ ] **Step 4:** Run `pnpm run test:integration subscriptions`. Expected: PASS.
- [ ] **Step 5:** Commit locally: `feat(subscriptions): add templates, lifecycle, pause, renew and close`.

### Task 8: Billing run

**Files:**
- Create: `src/server/services/billing.ts`, `src/app/(app)/billing/{page.tsx,actions.ts}`, `src/app/api/billing/run/route.ts`, `tests/integration/billing.test.ts`

**Interfaces:**
- Consumes: `priceInvoice`, `rankEligibleRules`, `addPeriod`, `prisma`.
- Produces: `type BillingChunk = { created: number; skipped: number; failed: { subscriptionId: string; reason: string }[]; nextCursor: string | null }`; `runBilling(opts: { today: Date; cursor?: string; limit?: number }): Promise<BillingChunk>` (default limit 50). The route handler accepts only the header `x-billing-secret` equal to `BILLING_CRON_SECRET`. The server action requires ADMIN or STAFF.

- [ ] **Step 1: Write the failing tests** (real Postgres, fixtures built through Prisma):
  - Two runs on the same day: the first creates 3 invoices, the second reports `created: 0, skipped: 3`.
  - A subscription three months behind gets exactly 3 invoices with `invoiceDate` equal to each `periodStart`.
  - `Promise.all` of two runs creates each invoice once.
  - A paused subscription, a non-ACTIVE subscription and one not yet due are not billed.
  - A subscription whose next period is past `expiryDate` is closed when the plan has `autoClose`, and left ACTIVE when it does not.
  - Discount: a PERCENT rule inside its dates is applied and `usedCount` rises by 1; two subscriptions competing for the last use give the discount to exactly one invoice, and the other uses the next best rule or none; an expired rule is ignored.
  - A subscription with no lines is returned in `failed` with a reason and creates no invoice (Review Focus 3).
  - One failing subscription does not stop the others, and is reported once even with `limit: 1`.
  - A route call without the secret header returns 401.
- [ ] **Step 2:** Run `pnpm run test:integration billing`. Expected: FAIL.
- [ ] **Step 3:** Implement `runBilling` per spec section 5: each subscription in its own transaction, `SELECT ... FOR UPDATE SKIP LOCKED` via raw SQL, re-check `nextBillingDate`, skip if any revision exists for the period, insert with `ON CONFLICT DO NOTHING`, snapshot lines, then apply the discount claim with the conditional `UPDATE ... WHERE usedCount < usageLimit` and fall back to the next ranked rule on zero rows.
- [ ] **Step 4:** Run `pnpm run test:integration billing`. Expected: PASS. The `/billing` page loops calling the action with `nextCursor` until it is null and shows created, skipped and failed.
- [ ] **Step 5:** Commit locally: `feat(billing): add idempotent billing run`.

### Task 9: Invoices and payments

**Files:**
- Create: `src/lib/validation/payment.ts`, `src/server/email.ts`, `src/server/services/{invoices,payments}.ts`, `src/app/(app)/invoices/**`, `src/app/(app)/payments/page.tsx`, `tests/integration/invoices.test.ts`

**Interfaces:**
- Consumes: `canRecordPayment`, `requireRole`.
- Produces (ADMIN or STAFF): `listInvoices(filters: { status?: InvoiceStatus; overdue?: boolean; customerId?: string; page: number })`; `getInvoice(id: string)`; `confirmInvoice(id: string): ActionResult<{ status }>` (DRAFT to CONFIRMED only); `sendInvoice(id: string): ActionResult<{}>` (uses `sendEmail`, console fallback); `recordPayment(input: { invoiceId: string; method: string; amount: string; paidAt: Date; note?: string }): ActionResult<{ paymentId: string }>`; `sendEmail(msg: { to: string; subject: string; html: string }): Promise<void>`.

- [ ] **Step 1: Write the failing tests:** `confirmInvoice` on a PAID invoice returns `ok: false`; `recordPayment` on a DRAFT invoice returns `ok: false`; a payment equal to the total moves the invoice to PAID, and `'100.1'` equals a total of `100.10` (Review Focus 5); `'99.99'` against `100.10` returns a field error on `amount` and leaves the status CONFIRMED; `overdue: true` returns only invoices with `dueDate` before today and status not PAID, and an invoice due today is not overdue (BR-10); `sendInvoice` without `RESEND_API_KEY` resolves and writes the message to the console.
- [ ] **Step 2:** Run `pnpm run test:integration invoices`. Expected: FAIL.
- [ ] **Step 3:** Implement the services and pages. `/invoices/[id]/print` is a clean HTML page with `@media print` styles. Payments list shows method, amount, date and note.
- [ ] **Step 4:** Run `pnpm run test:integration invoices`. Expected: PASS.
- [ ] **Step 5:** Commit locally: `feat(invoices): add confirm, send, print and payments`.

### Task 10: Customer portal

**Files:**
- Create: `src/server/services/portal.ts`, `src/app/portal/{page.tsx,invoices/page.tsx,invoices/[id]/page.tsx}`, `tests/integration/portal.test.ts`

**Interfaces:**
- Consumes: `requireRole('CUSTOMER')`, `prisma`.
- Produces: `listMySubscriptions(user: User, page: number)`; `listMyInvoices(user: User, page: number)`; `getMyInvoice(user: User, id: string): Promise<Invoice>` (throws `RuleError('NOT_FOUND')` for another customer's id).

- [ ] **Step 1: Write the failing tests:** customer A's lists contain none of customer B's rows; `getMyInvoice(A, invoiceOfB)` throws `NOT_FOUND`; an unknown id throws the same error; a STAFF caller of the portal pages is redirected.
- [ ] **Step 2:** Run `pnpm run test:integration portal`. Expected: FAIL.
- [ ] **Step 3:** Implement the services with `customerId = user.id` inside every query. Pages map `NOT_FOUND` to the 404 page.
- [ ] **Step 4:** Run `pnpm run test:integration portal`. Expected: PASS.
- [ ] **Step 5:** Commit locally: `feat(portal): add customer portal with scoped queries`.

### Task 11: Finance dashboard

**Files:**
- Create: `src/server/services/dashboard.ts`, `src/app/(app)/dashboard/page.tsx`, `tests/integration/dashboard.test.ts`

**Interfaces:**
- Consumes: `requireRole`, `prisma`.
- Produces: `type DashboardData = { activeSubscriptions: number; revenueReceived: Decimal; outstanding: Decimal; overdueCount: number; overdueInvoices: InvoiceRow[]; recentPayments: PaymentRow[] }`; `getDashboard(filters: { from?: Date; to?: Date; planId?: string; customerId?: string }): Promise<DashboardData>`.

- [ ] **Step 1: Write the failing test** with a fixed fixture of 3 active and 1 closed subscription, invoices of 100 (PAID), 200 (CONFIRMED, overdue) and 50 (CONFIRMED, due tomorrow), and one payment of 100: `activeSubscriptions` 3, `revenueReceived` 100, `outstanding` 250, `overdueCount` 1; filtering by `planId` changes the numbers to that plan's rows; `from` after the payment date gives `revenueReceived` 0.
- [ ] **Step 2:** Run `pnpm run test:integration dashboard`. Expected: FAIL.
- [ ] **Step 3:** Implement with SQL aggregates, not row loading. The page shows the four tiles, the overdue table and recent payments, with filters as URL params.
- [ ] **Step 4:** Run `pnpm run test:integration dashboard`. Expected: PASS.
- [ ] **Step 5:** Commit locally: `feat(dashboard): add finance dashboard`.

### Task 12: Seed data and performance check

**Files:**
- Create: `prisma/seed.ts`, `scripts/time-pages.ts`
- Modify: `package.json` (`prisma.seed`, `db:seed:volume`)

**Interfaces:**
- Consumes: all services and the schema.
- Produces: `pnpm run db:seed` (admin, staff, customers, Odoo +560 variant, all four plan periods, taxes, one discount rule) and `pnpm run db:seed:volume` (adds 5,000+ subscriptions with invoices and payments, reproducible from a fixed random seed).

- [ ] **Step 1: Write the failing test** in `tests/integration/seed.test.ts`: after seeding, the Odoo variant has `extraPrice` 560, all four billing periods exist, and re-running the seed does not duplicate users.
- [ ] **Step 2:** Run `pnpm run test:integration seed`. Expected: FAIL.
- [ ] **Step 3:** Implement the seed and the timing script. The script requests `/dashboard`, `/subscriptions`, `/invoices` and `/portal/invoices` with a signed-in session and prints each time.
- [ ] **Step 4:** Run `pnpm run db:seed:volume` then `pnpm exec tsx scripts/time-pages.ts`. Expected: every page under 2000 ms. If one is over, add the missing index and note it in the commit.
- [ ] **Step 5:** Commit locally: `feat(seed): add seed data, volume mode and page timing script`.

### Task 13: Docs alignment and smoke test

**Files:**
- Modify: `README.md`, `docs/TEAM_RULES.md`

- [ ] **Step 1:** Update the README tech stack, env table and architecture notes to match the spec (Clerk, Supabase, Zod, Vitest; remove JWT, class-validator, Docker Compose, and invoice cancel from features).
- [ ] **Step 2:** Confirm `docs/TEAM_RULES.md` and the spec describe `main` as the only shared branch (feature branches, PR into `main`) and no longer mention `dev` or `CLAUDE.md`.
- [ ] **Step 3:** Run `pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run test:integration && pnpm run build`. Expected: all exit 0.
- [ ] **Step 4:** Walk each scene in the brief in a browser in order: sign-up and reset, plan launch, quote to subscription, billing day, discount, payment, dashboard. Record anything failing as a new task.
- [ ] **Step 5:** Commit locally: `docs: align README and team rules with the spec`.
