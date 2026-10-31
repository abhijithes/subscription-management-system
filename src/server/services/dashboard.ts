import { Prisma } from "@/generated/prisma/client";
import { utcDay } from "@/lib/period";
import type { DashboardFilters } from "@/lib/validation/dashboard";
import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth/require-role";

const DAY_MS = 24 * 60 * 60 * 1000;
const TABLE_ROWS = 10;
const toDate = (day: string) => new Date(`${day}T00:00:00Z`);
const dayText = (d: Date) => d.toISOString().slice(0, 10);
const money = (d: { toFixed(places: number): string } | null) => (d ?? { toFixed: () => "0.00" }).toFixed(2);

/**
 * Every figure here is one SQL aggregate over the database, never a sum done in code.
 *
 * - Active subscriptions: as of today. The date range does not apply.
 * - Revenue received: payments with a payment date in the range.
 * - Unpaid and overdue: invoices dated in the range that are not PAID. Overdue is the BR-10 rule:
 *   due before today (UTC) and not paid. Due today is not overdue.
 * - Plan and customer narrow all of them.
 */
export async function getDashboard(filters: DashboardFilters) {
  await requireRole("ADMIN", "STAFF");
  const today = utcDay(new Date());
  const from = filters.from ? toDate(filters.from) : null;
  // The end day is inclusive, so compare to the start of the day after.
  const toExclusive = filters.to ? new Date(toDate(filters.to).getTime() + DAY_MS) : null;

  const plan = (alias: string) => (filters.planId ? Prisma.sql`AND ${Prisma.raw(alias)}."planId" = ${filters.planId}` : Prisma.empty);
  const customer = (alias: string) => (filters.customerId ? Prisma.sql`AND ${Prisma.raw(alias)}."customerId" = ${filters.customerId}` : Prisma.empty);
  const invoiceRange = Prisma.sql`
    ${from ? Prisma.sql`AND i."invoiceDate" >= ${from}` : Prisma.empty}
    ${toExclusive ? Prisma.sql`AND i."invoiceDate" < ${toExclusive}` : Prisma.empty}`;
  const paymentRange = Prisma.sql`
    ${from ? Prisma.sql`AND p."paidAt" >= ${from}` : Prisma.empty}
    ${toExclusive ? Prisma.sql`AND p."paidAt" < ${toExclusive}` : Prisma.empty}`;

  const [subscriptions, revenue, unpaid, overdueRows, paymentRows, plans, customers] = await Promise.all([
    prisma.$queryRaw<{ active: number; paused: number }[]>`
      SELECT COUNT(*)::int AS active, COUNT(*) FILTER (WHERE s."isPaused")::int AS paused
      FROM "Subscription" s
      WHERE s."status" = 'ACTIVE' ${plan("s")} ${customer("s")}`,

    prisma.$queryRaw<{ total: Prisma.Decimal; payments: number }[]>`
      SELECT COALESCE(SUM(p."amount"), 0) AS total, COUNT(*)::int AS payments
      FROM "Payment" p
      JOIN "Invoice" i ON i."id" = p."invoiceId"
      JOIN "Subscription" s ON s."id" = i."subscriptionId"
      WHERE TRUE ${paymentRange} ${plan("s")} ${customer("i")}`,

    prisma.$queryRaw<{ unpaid_total: Prisma.Decimal; unpaid_count: number; overdue_total: Prisma.Decimal; overdue_count: number }[]>`
      SELECT COALESCE(SUM(i."total"), 0) AS unpaid_total,
             COUNT(*)::int AS unpaid_count,
             COALESCE(SUM(i."total") FILTER (WHERE i."dueDate" < ${today}), 0) AS overdue_total,
             (COUNT(*) FILTER (WHERE i."dueDate" < ${today}))::int AS overdue_count
      FROM "Invoice" i
      JOIN "Subscription" s ON s."id" = i."subscriptionId"
      WHERE i."status" <> 'PAID' ${invoiceRange} ${plan("s")} ${customer("i")}`,

    prisma.$queryRaw<{ id: string; number: string; customer: string; dueDate: Date; total: Prisma.Decimal }[]>`
      SELECT i."id", i."number", u."name" AS customer, i."dueDate", i."total"
      FROM "Invoice" i
      JOIN "Subscription" s ON s."id" = i."subscriptionId"
      JOIN "User" u ON u."id" = i."customerId"
      WHERE i."status" <> 'PAID' AND i."dueDate" < ${today} ${invoiceRange} ${plan("s")} ${customer("i")}
      ORDER BY i."dueDate" ASC, i."id" ASC
      LIMIT ${TABLE_ROWS}`,

    prisma.$queryRaw<{ id: string; invoiceId: string; number: string; customer: string; method: string; amount: Prisma.Decimal; paidAt: Date }[]>`
      SELECT p."id", p."invoiceId", i."number", u."name" AS customer, p."method", p."amount", p."paidAt"
      FROM "Payment" p
      JOIN "Invoice" i ON i."id" = p."invoiceId"
      JOIN "Subscription" s ON s."id" = i."subscriptionId"
      JOIN "User" u ON u."id" = i."customerId"
      WHERE TRUE ${paymentRange} ${plan("s")} ${customer("i")}
      ORDER BY p."paidAt" DESC, p."id" ASC
      LIMIT ${TABLE_ROWS}`,

    prisma.plan.findMany({ orderBy: { name: "asc" }, take: 200, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { role: "CUSTOMER" }, orderBy: { name: "asc" }, take: 500, select: { id: true, name: true } }),
  ]);

  const [subs] = subscriptions;
  const [paid] = revenue;
  const [owed] = unpaid;
  return {
    asOf: dayText(today),
    figures: {
      activeSubscriptions: subs.active,
      pausedSubscriptions: subs.paused,
      revenueReceived: money(paid.total),
      paymentCount: paid.payments,
      unpaidAmount: money(owed.unpaid_total),
      unpaidCount: owed.unpaid_count,
      overdueCount: owed.overdue_count,
      overdueAmount: money(owed.overdue_total),
    },
    overdueInvoices: overdueRows.map((r) => ({
      id: r.id,
      number: r.number,
      customer: r.customer,
      dueDate: dayText(r.dueDate),
      daysOverdue: Math.max(1, Math.round((today.getTime() - utcDay(r.dueDate).getTime()) / DAY_MS)),
      total: money(r.total),
    })),
    recentPayments: paymentRows.map((r) => ({
      id: r.id,
      invoiceId: r.invoiceId,
      number: r.number,
      customer: r.customer,
      method: r.method,
      amount: money(r.amount),
      paidAt: dayText(r.paidAt),
    })),
    options: { plans, customers },
  };
}
