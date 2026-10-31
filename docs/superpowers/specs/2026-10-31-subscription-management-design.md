# Subscription Management System: Design Spec

Date: 2026-10-31
Status: Draft for team review
Source: Brightloop Software brief (PDF) and "Subscription Management System Business Requirements" (requirement IDs such as AUTH-01 and BR-05 refer to that document).

## 1. Goal and success criteria

One platform that runs a subscription business from customer sign-up to revenue reporting, replacing spreadsheets, hand-typed invoices and quarterly reports.

Success means:

- Every scene in the brief works end to end.
- Nothing is billed twice or skipped (INV-06, BR-05).
- The server enforces all business rules, whatever the UI sends.
- Every page responds in under 2 seconds with thousands of subscriptions (PERF-01).
- Dynamic data, responsive UI, input validation, clear navigation, and commits from every team member (judging criteria).

## 2. Stack and decisions

| Concern | Decision |
| --- | --- |
| Framework | Next.js (App Router), TypeScript, full-stack |
| Database | Supabase Postgres, accessed only through our own backend (never from the browser) |
| ORM and migrations | Prisma, migrations committed to git |
| Auth | Clerk for identity (sign-up, login, password reset email, password policy). Our `users` table is the source of truth for roles |
| UI | Tailwind CSS and shadcn/ui, responsive |
| Validation | Zod, one schema per form shared by client and server |
| Email | Resend for invoice sending. Falls back to console output when no key is set |
| Tests | Vitest (unit and integration) |

Decisions made during design:

- Clerk, not our own auth and not Supabase Auth.
- Modular monolith: server actions and route handlers call one shared `services/` layer.
- Money is `decimal(12,2)`, handled with Prisma Decimal on the server. Rounding is per line, and the invoice total is the sum of the lines.

## 3. Assumptions (from the brief's open questions)

- Due date = invoice date + the subscription's payment terms (days).
- Pause stops billing until resumed.
- Renew extends the same subscription by its original duration (`expiryDate - startDate`).
- Staff can create quotation templates and view the finance dashboard.
- Reset links come from Clerk. Sent invoices use Resend, or print to the server console.
- Print means a printable invoice page that the browser can save as PDF.
- Partial payments are out of scope for the first build. An invoice becomes Paid when one payment covers the full total.
- Invoice cancel is out of scope for the first build. Statuses are Draft, Confirmed, Paid.

## 4. Data model

Money columns are `decimal(12,2)`.

### Identity

`User`: `clerkUserId` (unique), `email` (unique), `name`, `company`, `address`, `role` (ADMIN, STAFF, CUSTOMER). Customers are users with the CUSTOMER role.

### Catalog (admin only)

- `Product`: name, type, `salesPrice`, `costPrice`, notes.
- `ProductVariant`: `productId`, `attribute` (for example "Brand"), `value` (for example "Odoo"), `extraPrice` (560). Line price = `salesPrice` + `extraPrice` (PRD-03).
- `Plan`: price, `billingPeriod` (DAILY, WEEKLY, MONTHLY, YEARLY), `minQuantity`, `availableFrom`, `availableTo`, `autoClose`, `allowEarlyClose`, `allowPause`, `allowRenew`.
- `Tax`: name, `ratePercent`.
- `DiscountRule`: `type` (FIXED or PERCENT), `value`, `minPurchase` (optional), `minQuantity` (optional), `startsAt`, `endsAt`, `usageLimit`, `usedCount`, `appliesTo` (PRODUCT or SUBSCRIPTION), `productId` (when `appliesTo` is PRODUCT).

### Sales

- `QuotationTemplate`: `planId`, `validityDays`, with `TemplateLine` rows (product, variant, quantity).
- `Subscription`: `number` (unique), `customerId`, `planId`, `status` (DRAFT, QUOTATION, CONFIRMED, ACTIVE, CLOSED), `isPaused`, `pausedAt`, `startDate`, `expiryDate`, `paymentTermsDays`, `nextBillingDate`, `quotationExpiresAt`.
- `SubscriptionLine`: product, variant, `quantity`, `unitPrice`, `taxId`. The amount is computed on the server, never taken from the client.

### Billing

- `Invoice`: `number`, `subscriptionId`, `customerId`, `periodStart`, `periodEnd`, `revision` (int, default 1), `status` (DRAFT, CONFIRMED, PAID), `invoiceDate`, `dueDate`, `subtotal`, `discountTotal`, `taxTotal`, `total`. Unique key `(subscriptionId, periodStart, revision)`.
- `InvoiceLine`: snapshot of description, quantity, unit price, tax name, tax rate, discount, amount. Later price or tax changes never alter old invoices.
- `InvoiceDiscount`: links an invoice to the rule applied. This is how `usedCount` is counted once.
- `Payment`: `invoiceId`, `method`, `amount`, `paidAt`, `note`, `recordedById`.

`revision` exists so that cancel and reissue can be added later without a migration. Nothing uses revision 2 in the first build.

"Overdue" is derived, not stored: `dueDate < today` and status is not PAID (BR-10).

### Indexes

Subscription `status` and `nextBillingDate`, `customerId`. Invoice `status`, `dueDate`, `customerId`. Payment `invoiceId`, `paidAt`.

## 5. Billing-day run

**Trigger.** A "Run billing" button for Admin and Staff, checked by role. The same function sits behind a route protected by a service-secret header (`BILLING_CRON_SECRET`) for scheduled jobs.

**Due subscriptions.** `status = ACTIVE AND isPaused = false AND nextBillingDate <= today`, and the period starts on or before `expiryDate`.

**Chunking.** The run processes due subscriptions in chunks of about 50 per request, ordered by id, using a cursor (the last id processed). The UI repeats the call until nothing is left. A failed subscription is reported once and is not re-queried in the same run.

**Per subscription, in its own transaction:**

1. Lock the row with `SELECT ... FOR UPDATE SKIP LOCKED` and re-check `nextBillingDate` inside the transaction. A second concurrent run skips it.
2. `periodStart = nextBillingDate`, `periodEnd = periodStart` plus one plan period.
3. Insert the invoice with `INSERT ... ON CONFLICT DO NOTHING`. If any revision already exists for that period, count the subscription as skipped.
4. `invoiceDate = periodStart`. Catch-up invoices land in the right period for overdue and revenue figures. `dueDate = invoiceDate + paymentTermsDays`. Status is DRAFT.
5. Build lines from the subscription lines. Snapshot the price, tax name and tax rate.
6. Choose the discount (see below).
7. Apply the discount first, then calculate tax on the post-discount amount. Round per line. The invoice total is the sum of the lines.
8. Advance `nextBillingDate` by one period.
9. If the next period is past `expiryDate`: close the subscription when the plan has `autoClose` (PLN-05). Otherwise leave it ACTIVE and show it as expired so staff can renew or close it.

**Nothing skipped (INV-06).** A subscription several periods behind loops until caught up, one invoice per missed period.

**Failure isolation.** Each subscription commits on its own. The result screen reports created, skipped (already billed) and failed, with a reason for each failure.

**Discount selection (DSC-01 to DSC-08, BR-07).** A rule applies when all of these hold:

- The invoice date is within `startsAt` to `endsAt`.
- The pre-tax subtotal meets `minPurchase`, and the quantity meets `minQuantity`.
- `usedCount < usageLimit`.
- The target matches: a PRODUCT rule applies to lines for that product, a SUBSCRIPTION rule applies to the whole subtotal.

If several rules match, apply only the one with the largest saving. Ties go to the earlier `endsAt`, then the lower id. Claim the use with `UPDATE ... SET usedCount = usedCount + 1 WHERE id = ? AND usedCount < usageLimit`. If that update affects no rows because the limit was just reached, try the next best rule. Record the rule in `InvoiceDiscount`.

**Pause, resume, renew.**

- Pause sets `isPaused = true` and `pausedAt`. On resume, `nextBillingDate` becomes the resume date, so paused time is not back-billed.
- Renew extends `expiryDate` by the original duration and keeps the subscription number.
- Pause, early close and renew are allowed only if the plan's flags allow them (BR-08).

## 6. Status rules

- Subscription statuses move forward in order: DRAFT, QUOTATION, CONFIRMED, ACTIVE, CLOSED (BR-04). One state-machine function owns the allowed transitions.
- Invoice statuses: DRAFT, CONFIRMED, PAID. An invoice becomes PAID when a payment covers the full total. Recording a payment requires CONFIRMED status.
- A subscription line quantity must be at least the plan's `minQuantity` (BR-09).

## 7. Pages and navigation

One app shell with a sidebar that changes by role. The sidebar collapses to a menu on phones. Customers get a simpler top-nav shell.

| Area | Routes | Who |
| --- | --- | --- |
| Public | `/sign-in`, `/sign-up`, `/forgot-password` (Clerk) | Everyone |
| Dashboard | `/dashboard` | Admin, Staff |
| Subscriptions | `/subscriptions` (list, status filter, search), `/subscriptions/new`, `/subscriptions/[id]` (lines, status stepper, actions) | Admin, Staff |
| Quotation templates | `/templates`, `/templates/new` | Admin, Staff |
| Invoices | `/invoices` (filters: status, overdue, customer), `/invoices/[id]` (confirm, send, print), `/invoices/[id]/print` | Admin, Staff |
| Billing run | `/billing` (Run billing button, result report) | Admin, Staff |
| Payments | recorded from the invoice page, `/payments` lists them | Admin, Staff |
| Catalog | `/products`, `/plans`, `/taxes`, `/discounts` | Admin only |
| Team | `/team` (add staff) | Admin only |
| Portal | `/portal` (my subscriptions), `/portal/invoices`, `/portal/invoices/[id]` | Customer |

**Finance dashboard (DSH-01 to DSH-06).** Summary tiles: active subscriptions, revenue received, amount outstanding, overdue count. Below them an overdue invoices table and a recent payments table. Filters: date range, plan, customer. All figures come from SQL aggregates.

**Print.** `/invoices/[id]/print` is a clean HTML page with `@media print` styles.

**Email.** Invoice sending and any app email go through Resend. With no key set, the content prints to the server console.

## 8. Access control

Three layers:

1. **Middleware** blocks signed-out users and redirects each role to its own home page.
2. **`requireRole()`** runs at the top of every server action and route handler. This is the real gate. The UI is never trusted.
3. **Query scoping.** Every portal query adds `customerId = currentUser.id` inside the service function (BR-03). A wrong id returns 404, not 403, so ids are not leaked.

**Users.**

- A `users` row is created the first time a signed-in Clerk user reaches the app (no webhooks needed). Public sign-up always creates CUSTOMER.
- Admin adds staff (AUTH-06) with a server-only action that calls Clerk's backend API to create or invite the user, then inserts a STAFF row.
- The first admin is created by the seed script.
- Password policy (AUTH-03, BR-02): Clerk dashboard settings require minimum length 9, an uppercase letter, a lowercase letter and a special character. Our own sign-up path also validates with Zod. The Clerk settings are documented in the README.

## 9. Validation and errors

- Each form has one Zod schema shared by the client form and the server action. The server re-validates every input and recalculates taxes, discounts and totals itself (BR-06). Errors show inline next to each field.
- Server actions return a typed result: `{ ok: true, data }` or `{ ok: false, fieldErrors, message }`. Expected failures (validation, forbidden actions, illegal status moves) do not throw to the UI.
- Unexpected errors are logged on the server and show a generic message.

## 10. Performance

- Lists are server-paginated, 25 rows per page.
- Indexes as in section 4. Pages are server-rendered.
- The seed script has a volume mode that generates 5,000+ subscriptions with invoices and payments. Key pages are timed against the 2-second target.

## 11. Testing

**Unit tests (Vitest)** on pure rule functions:

- Line price (product plus variant extra), tax, discount, and rounding so lines sum to the total.
- Discount eligibility: dates, minimums and remaining uses.
- Status state machines, and pause, close and renew gated by plan flags (BR-04, BR-08).
- Password policy (BR-02) and minimum quantity (BR-09).

**Integration tests against a real Postgres** (separate test schema):

- Running billing twice creates no duplicate invoices.
- A catch-up subscription gets one invoice per missed period.
- Two concurrent runs create each invoice once.
- A discount's last use goes to only one invoice.
- A Customer requesting another customer's invoice gets a 404.

**Manual smoke test** of each scene in the brief, in order, before the demo.

## 12. Seed data

`prisma/seed.ts` creates a first admin, staff and customers, sample products with the Odoo brand variant (+560), plans for all four billing periods, taxes and a discount rule. A volume mode generates 5,000+ subscriptions. Runs are reproducible.

## 13. Repository layout

```
prisma/                 schema, migrations, seed
src/app/                pages and route handlers
src/components/         UI components
src/server/services/    business logic, one file per module (the only place rules live)
src/server/auth/        requireRole, current user, Clerk helpers
src/lib/money.ts        decimal helpers and rounding
src/lib/validation/     shared Zod schemas
docs/                   spec, team rules
```

## 14. Team workflow

See `docs/TEAM_RULES.md` for the working rules. In short: `main` is the only shared branch and the source of truth, and each member works on `feat/<area>` branches and opens PRs into `main` under their own git identity. One owner per module. The schema is frozen after spec approval, and later changes are additive migrations through a PR all four see.

Module split:

1. Auth and users: sign-up, login, reset, roles, staff creation, customer portal.
2. Catalog: products, variants, plans, taxes, discount rules.
3. Quotations and subscriptions: templates, lifecycle, pause, renew, close.
4. Invoicing, payments and dashboard: billing run, invoice actions, payments, finance dashboard.

## 15. Stretch (only if time allows, in this order)

1. Invoice cancel and reissue using `revision`, with the discount use given back on cancel.
2. Partial payments, with an `amountPaid` field and Paid when payments cover the total.

## 16. Environment variables

`DATABASE_URL` (Supabase pooled), `DIRECT_URL` (Supabase direct, for migrations), `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `RESEND_API_KEY` (optional), `BILLING_CRON_SECRET`, `APP_URL`. A `.env.example` lists them. `.env.local` is git-ignored.
