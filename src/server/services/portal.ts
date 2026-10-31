import type { User } from "@/generated/prisma/client";
import { RuleError } from "@/lib/errors";
import { sumMoney } from "@/lib/money";
import { utcDay } from "@/lib/period";
import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth/require-role";
import { PAGE_SIZE } from "./catalog";

const day = (d: Date) => d.toISOString().slice(0, 10);
const money = (d: { toFixed(places: number): string }) => d.toFixed(2);
const pageOf = (page: number) => (Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1);

/** Every query below filters on `customerId = user.id`; nothing a customer sends picks the owner. */
async function customer(): Promise<User> {
  return requireRole("CUSTOMER");
}

export async function listMySubscriptions(page: number) {
  const user = await customer();
  const current = pageOf(page);
  const where = { customerId: user.id };
  const [rows, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      orderBy: [{ startDate: "desc" }, { id: "asc" }],
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { plan: { select: { name: true } } },
    }),
    prisma.subscription.count({ where }),
  ]);
  return {
    page: current,
    pageSize: PAGE_SIZE,
    total,
    rows: rows.map((s) => ({
      id: s.id,
      number: s.number,
      planName: s.plan.name,
      status: s.status,
      isPaused: s.isPaused,
      startDate: day(s.startDate),
      expiryDate: day(s.expiryDate),
    })),
  };
}

/** Customers never see drafts: an invoice only exists for them once it is confirmed. */
export async function listMyInvoices(page: number) {
  const user = await customer();
  const current = pageOf(page);
  const today = utcDay(new Date());
  const where = { customerId: user.id, status: { not: "DRAFT" as const } };
  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: [{ invoiceDate: "desc" }, { id: "asc" }],
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.invoice.count({ where }),
  ]);
  return {
    page: current,
    pageSize: PAGE_SIZE,
    total,
    rows: rows.map((i) => ({
      id: i.id,
      number: i.number,
      status: i.status,
      overdue: i.dueDate < today && i.status !== "PAID",
      invoiceDate: day(i.invoiceDate),
      dueDate: day(i.dueDate),
      total: money(i.total),
    })),
  };
}

/** Another customer's invoice, a draft and an unknown id all look the same: NOT_FOUND. */
export async function getMyInvoice(id: string) {
  const user = await customer();
  const invoice = await prisma.invoice.findFirst({
    where: { id, customerId: user.id, status: { not: "DRAFT" } },
    include: {
      subscription: { select: { number: true } },
      lines: { orderBy: { id: "asc" } },
      payments: { orderBy: { paidAt: "asc" } },
    },
  });
  if (!invoice) throw new RuleError("NOT_FOUND", "Invoice not found");

  const today = utcDay(new Date());
  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    overdue: invoice.dueDate < today && invoice.status !== "PAID",
    subscriptionNumber: invoice.subscription.number,
    periodStart: day(invoice.periodStart),
    periodEnd: day(invoice.periodEnd),
    invoiceDate: day(invoice.invoiceDate),
    dueDate: day(invoice.dueDate),
    subtotal: money(invoice.subtotal),
    discountTotal: money(invoice.discountTotal),
    taxTotal: money(invoice.taxTotal),
    total: money(invoice.total),
    amountPaid: money(sumMoney(invoice.payments.map((p) => p.amount))),
    lines: invoice.lines.map((l) => ({
      id: l.id,
      description: l.description,
      quantity: l.quantity,
      unitPrice: money(l.unitPrice),
      discount: money(l.discount),
      amount: money(l.amount),
    })),
  };
}
