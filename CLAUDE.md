# Subscription Management System

Next.js (App Router) + TypeScript, Prisma, Supabase Postgres, Clerk, Tailwind + shadcn/ui, Zod, Vitest.

Before working, read:

- `docs/superpowers/specs/2026-10-31-subscription-management-design.md` (the design and data model)
- `docs/TEAM_RULES.md` (git workflow, ownership, code rules, definition of done)

Non-negotiables (details in the team rules):

- Business rules live in `src/server/services/` only, never in pages or components.
- Every server action and route handler starts with `requireRole(...)`. Customer queries are scoped by `customerId`.
- Taxes, discounts and totals are computed on the server. Money is `decimal(12,2)`, rounded per line, total = sum of lines.
- Status changes go through the entity's state-machine function.
- The schema is frozen after spec approval. Later changes are additive migrations through a PR.
- Out of scope for the first build: invoice cancel and partial payments (see stretch list in the spec).
- Never commit `.env*` files or secrets.
