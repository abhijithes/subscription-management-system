# Subscription Management System

A unified platform for running the full life of a subscription business: products and plans, quotations, subscriptions, automated recurring invoices, payments, discounts, taxes and revenue reporting.

Built for the **Odoo x Make-A-Ton 9.0 Kochi Hackathon 2026** (virtual round, 31 Oct 2026). The scenario is **Brightloop Software**, a company that sells software on monthly and yearly subscriptions.

## Team

| Name | Role | GitHub |
|---|---|---|
| _Your name_ | Team leader | _@handle_ |
| _Member 2_ | | _@handle_ |

## The Problem

Brightloop tracks subscriptions in a spreadsheet, types invoices by hand, matches payments by scrolling bank statements and builds revenue reports once a quarter. Renewals get missed, invoices go out wrong, and nobody knows the real recurring revenue.

## Features

**Accounts and roles**
- Sign up with a unique email and a strong password (more than 8 characters, with an uppercase letter, a lowercase letter and a special character)
- Forgot-password flow with a reset link sent to the registered email
- Three roles: **Admin** (full control, only role that can add staff), **Staff** (day-to-day work, limited access), **Customer** (portal showing only their own subscriptions and invoices)

**Products and plans**
- Products with name, type, sales price, cost price and notes
- Variants (for example brand), each with an extra price, such as Odoo brand +560
- Plans with billing period (daily, weekly, monthly, yearly), minimum quantity and availability dates
- Per-plan options set by the admin: auto-close at end date, early close, pause, renew

**Quotations and subscriptions**
- Quotation templates with preset plan and product lines and a validity period in days
- Subscriptions with a unique number, customer, plan, start and expiry dates, payment terms and lines (product, quantity, unit price, taxes, amount)
- Lifecycle: `Draft → Quotation → Confirmed → Active → Closed`, visible to the whole team

**Invoicing**
- Invoices generated automatically from each due subscription, with customer details, lines, taxes and totals filled in
- Taxes calculated from admin-defined rules
- Confirm, cancel, send or print any invoice. Lifecycle: `Draft → Confirmed → Paid`
- Idempotent billing: nothing is billed twice or skipped

**Discounts**
- Admin-only rules: fixed amount or percentage, minimum purchase or quantity, start and end dates, usage limit
- Applies to specific products or whole subscriptions
- Added to the next invoice automatically and stops when expired or used up

**Payments**
- Record method, amount, date and note against the right invoice
- Paid and outstanding views, with overdue invoices highlighted

**Finance dashboard**
- Active subscriptions, revenue, payments received, outstanding amount and overdue invoices
- Filters and summary view, every page responding in under two seconds

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (React), responsive UI |
| Backend | NestJS (REST API) |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT with role-based guards |
| Validation | class-validator on the server, Zod on the client |
| Infra | Docker Compose |

## Architecture Notes

- **No double billing.** A unique constraint on `(subscription_id, period_start)` plus a transactional billing job that advances `next_billing_date` in the same transaction. Re-running the job is safe.
- **Roles enforced on the server.** Guards on every route. Customer queries are always filtered by the authenticated user's id.
- **Server-side totals.** Taxes, discounts and totals are computed in the backend and stored per invoice line. Client values are never trusted.
- **Discounts at invoice time.** Eligible rules (date window, minimum quantity or amount, usage left) are applied as a discount line and `used_count` is incremented atomically.
- **Performance.** Indexes on `status`, `next_billing_date`, `customer_id`, `due_date` and invoice `status`. Paginated lists. Dashboard numbers come from SQL aggregates.

## Data Model (summary)

`users`, `password_resets`, `products`, `product_variants`, `plans`, `quotation_templates`, `template_lines`, `subscriptions`, `subscription_lines`, `taxes`, `discounts`, `invoices`, `invoice_lines`, `payments`

## Getting Started

### Prerequisites
- Node.js 20+
- Docker and Docker Compose

### Setup

```bash
# 1. Clone
git clone <repo-url>
cd <repo-folder>

# 2. Start PostgreSQL
docker compose up -d db

# 3. Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run seed          # demo data, including thousands of subscriptions
npm run start:dev

# 4. Frontend (new terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:4000

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign tokens |
| `JWT_EXPIRES_IN` | Token lifetime, for example `1d` |
| `MAIL_HOST`, `MAIL_USER`, `MAIL_PASS` | SMTP settings for reset links (if unset, the link is printed to the server console) |
| `APP_URL` | Frontend base URL used in reset links |
| `NEXT_PUBLIC_API_URL` | API base URL for the frontend |

## Demo Accounts

Created by the seed script.

| Role | Email | Password |
|---|---|---|
| Admin | _set in seed_ | _set in seed_ |
| Staff | _set in seed_ | _set in seed_ |
| Customer | _set in seed_ | _set in seed_ |

## Running the Billing Job

- **Manual:** the admin uses the "Run billing" action on the Invoices page.
- **Scheduled:** a cron job runs daily and bills every subscription whose `next_billing_date` is due.

## Project Structure

```
.
├── backend/
│   ├── prisma/          # schema, migrations, seed
│   └── src/
│       ├── auth/        # signup, login, reset, role guards
│       ├── products/    # products, variants
│       ├── plans/
│       ├── templates/   # quotation templates
│       ├── subscriptions/
│       ├── invoices/    # generation, taxes, lifecycle
│       ├── discounts/
│       ├── payments/
│       └── dashboard/   # aggregates and filters
├── frontend/
│   └── src/             # admin/staff app and customer portal
├── docker-compose.yml
└── README.md
```

## Status

- [ ] Auth, roles and password reset
- [ ] Products, variants and plans
- [ ] Quotation templates and subscription lifecycle
- [ ] Invoice generation, taxes and discounts
- [ ] Payments and overdue tracking
- [ ] Finance dashboard
- [ ] Customer portal

## License

MIT
