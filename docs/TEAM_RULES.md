# Team Rules

Read this before your first commit. The design lives in `docs/superpowers/specs/2026-10-31-subscription-management-design.md`. If a rule here conflicts with the spec, ask the team and fix whichever is wrong.

## 1. Git

- `main` is protected: demo-ready code only, merged from `dev` by the team leader.
- `dev` is the integration branch. Nobody commits to `dev` directly.
- Work on `feat/<area>-<short-name>` (for example `feat/catalog-plans`) or `fix/<short-name>`. Branch from the latest `dev`.
- Commit under your own git identity (`git config user.name` and `user.email`). Judges check that every member committed.
- Small commits with clear messages: `feat(catalog): add plan form`, `fix(billing): skip paused subscriptions`. Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
- Open a PR into `dev`. At least one teammate reviews before it merges. Pull `dev` into your branch before opening the PR.
- Never force-push to `dev` or `main`. Never commit `.env*` files, keys or database dumps.

## 2. Module ownership

| Module | Owner | Scope |
| --- | --- | --- |
| Auth and users | _name_ | Clerk setup, `users` table, `requireRole`, staff creation, customer portal |
| Catalog | _name_ | Products, variants, plans, taxes, discount rules |
| Quotations and subscriptions | _name_ | Templates, subscription lifecycle, pause, renew, close |
| Invoicing, payments, dashboard | _name_ | Billing run, invoice actions, payments, finance dashboard |

Fill in the owners at the first sync. You can open PRs against another module, but the owner must review them.

## 3. Shared files: change by PR only

These affect everyone. Change them only through a PR that all four teammates see:

- `prisma/schema.prisma` and `prisma/migrations/`
- `src/lib/money.ts`
- `src/server/auth/`
- `src/lib/validation/` shared schemas

**Schema rules:**

- The schema is frozen once the spec is approved.
- After that, only additive changes (new columns or tables), as a new migration. Never edit a migration that is already merged.
- Run `npx prisma migrate dev --name <what-changed>` locally, commit the generated migration, and tell the team.
- Only one person applies migrations to the shared Supabase project, to avoid conflicts. Agree who at the first sync.

## 4. Code rules (these enforce the business rules)

1. **Rules live in `src/server/services/` only.** Pages and components call services. They never contain tax, discount, total or status logic.
2. **Every server action and route handler starts with `requireRole(...)`.** No exceptions. The UI hiding a button is not security.
3. **Customer data is always scoped.** Any portal query includes `customerId = currentUser.id` inside the service. Return 404, not 403, for something that isn't theirs.
4. **Never trust the client for money.** Taxes, discounts and totals are calculated on the server. Ignore any amount the client sends.
5. **Money uses `decimal(12,2)` with Prisma Decimal.** No JavaScript floats for money. Use the helpers in `src/lib/money.ts`. Round per line, and the invoice total is the sum of the lines.
6. **Validate with Zod on both sides.** One schema per form in `src/lib/validation/`, used by the form and re-checked in the server action.
7. **Status changes go through the state-machine function** for that entity. Never set `status` directly.
8. **Server actions return `{ ok, data }` or `{ ok: false, fieldErrors, message }`.** Don't throw for expected failures.
9. **Only the backend talks to the database.** No Supabase client in the browser, no database keys in client code.
10. **Lists are paginated on the server** (25 per page). No "load everything and filter in the browser".
11. **Add an index for any column you filter or sort a large table by.** Mention it in the PR.

## 5. UI rules

- Responsive from phone width up. No horizontal page scroll.
- Use shadcn/ui components and Tailwind. Don't add another UI library without asking.
- Every form shows inline field errors from the server result.
- Every list has an empty state and a loading state.
- Sidebar items only for routes the role may open (the server still enforces it).

## 6. Testing and definition of done

A task is done when:

- It works for the roles it applies to, and a role that must not use it is refused on the server.
- Rule logic has unit tests (`npm test` passes). Billing, discount-usage and customer-isolation changes have integration tests.
- `npm run lint` and `npx tsc --noEmit` pass.
- No secrets or debug logging are committed.
- The PR description says what changed and how you checked it.

## 7. Local setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the shared Supabase and Clerk values (ask the team leader, never commit them).
3. `npx prisma migrate dev` then `npx prisma db seed`
4. `npm run dev` and open http://localhost:3000

## 8. Working with Claude Code

`CLAUDE.md` in the repo root points Claude Code at these rules and the spec, so a teammate's session follows the same conventions. If you change a rule here, update `CLAUDE.md` in the same PR.

## 9. Sync points

- Start: freeze the schema and agree on the migration owner (first ~40 minutes).
- Mid-build: merge all four modules into `dev`, run the billing flow end to end.
- Before demo: seed the volume data, time the key pages against the 2-second target, run the smoke test of every scene in the brief.
