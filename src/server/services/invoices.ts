import type { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/errors";
import { sumMoney } from "@/lib/money";
import { utcDay } from "@/lib/period";
import type { InvoiceFilters } from "@/lib/validation/invoice";
import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth/require-role";
import { sendEmail } from "@/server/email";
import { renderInvoiceEmail } from "@/server/invoice-email";
import { PAGE_SIZE } from "./catalog";
import { denyUnlessRole, guarded } from "./guard";

const day = (d: Date) => d.toISOString().slice(0, 10);
const money = (d: { toFixed(places: number): string }) => d.toFixed(2);

/** Overdue is derived, never stored (BR-10): due before today and not paid. Due today is not overdue. */
const isOverdue = (dueDate: Date, status: string, today: Date) => dueDate < today && status !== "PAID";

export async function listInvoices(filters: InvoiceFilters) {
  await requireRole("ADMIN", "STAFF");
  const current = Number.isFinite(filters.page) ? Math.max(1, Math.floor(filters.page)) : 1;
  const today = utcDay(new Date());

  const where: Prisma.InvoiceWhereInput = {
    AND: [
      filters.status ? { status: filters.status } : {},
      filters.customerId ? { customerId: filters.customerId } : {},
      filters.overdue ? { dueDate: { lt: today }, status: { not: "PAID" } } : {},
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: [{ invoiceDate: "desc" }, { id: "asc" }],
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { customer: { select: { name: true } } },
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
      customerName: i.customer.name,
      status: i.status,
      overdue: isOverdue(i.dueDate, i.status, today),
      invoiceDate: day(i.invoiceDate),
      dueDate: day(i.dueDate),
      total: money(i.total),
    })),
  };
}

/** Customers to filter the invoice list by. */
export async function listCustomerOptions() {
  await requireRole("ADMIN", "STAFF");
  return prisma.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { name: "asc" },
    take: 500,
    select: { id: true, name: true, email: true },
  });
}

/** One invoice with its snapshot lines, the discount applied and its payments, or null. */
export async function getInvoice(id: string) {
  await requireRole("ADMIN", "STAFF");
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, email: true, company: true, address: true } },
      subscription: { select: { id: true, number: true } },
      lines: { orderBy: { id: "asc" } },
      discounts: { include: { discountRule: { select: { name: true } } } },
      payments: { orderBy: { paidAt: "asc" } },
    },
  });
  if (!invoice) return null;

  const today = utcDay(new Date());
  const paid = sumMoney(invoice.payments.map((p) => p.amount));
  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    overdue: isOverdue(invoice.dueDate, invoice.status, today),
    customer: invoice.customer,
    subscription: invoice.subscription,
    periodStart: day(invoice.periodStart),
    periodEnd: day(invoice.periodEnd),
    invoiceDate: day(invoice.invoiceDate),
    dueDate: day(invoice.dueDate),
    subtotal: money(invoice.subtotal),
    discountTotal: money(invoice.discountTotal),
    taxTotal: money(invoice.taxTotal),
    total: money(invoice.total),
    amountPaid: money(paid),
    discountNames: invoice.discounts.map((d) => d.discountRule.name),
    lines: invoice.lines.map((l) => ({
      id: l.id,
      description: l.description,
      quantity: l.quantity,
      unitPrice: money(l.unitPrice),
      tax: l.taxName ? `${l.taxName} (${money(l.taxRatePercent)}%)` : null,
      discount: money(l.discount),
      amount: money(l.amount),
    })),
    payments: invoice.payments.map((p) => ({
      id: p.id,
      method: p.method,
      amount: money(p.amount),
      paidAt: day(p.paidAt),
      note: p.note,
    })),
    actions: {
      canConfirm: invoice.status === "DRAFT",
      canSend: invoice.status !== "DRAFT",
    },
  };
}

/** DRAFT to CONFIRMED, and nothing else. */
export async function confirmInvoice(id: string): Promise<ActionResult<{ status: "CONFIRMED" }>> {
  const denied = await denyUnlessRole("ADMIN", "STAFF");
  if (denied) return denied;

  const confirmed = await prisma.invoice.updateMany({ where: { id, status: "DRAFT" }, data: { status: "CONFIRMED" } });
  if (confirmed.count === 1) return { ok: true, data: { status: "CONFIRMED" } };

  const existing = await prisma.invoice.findUnique({ where: { id }, select: { status: true } });
  return {
    ok: false,
    message: existing ? `Only a draft invoice can be confirmed (this one is ${existing.status.toLowerCase()})` : "Invoice not found",
  };
}

/** Emails the invoice to its customer. A draft must be confirmed first. */
export async function sendInvoice(id: string): Promise<ActionResult<{ to: string; via: "resend" | "console" }>> {
  const denied = await denyUnlessRole("ADMIN", "STAFF");
  if (denied) return denied;

  return guarded(async () => {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { customer: { select: { name: true, email: true } }, lines: { orderBy: { id: "asc" } } },
    });
    if (!invoice) return { ok: false, message: "Invoice not found" };
    if (invoice.status === "DRAFT") return { ok: false, message: "Confirm the invoice before sending it" };

    const { subject, html } = renderInvoiceEmail({
      number: invoice.number,
      customerName: invoice.customer.name,
      invoiceDate: day(invoice.invoiceDate),
      dueDate: day(invoice.dueDate),
      subtotal: money(invoice.subtotal),
      discountTotal: money(invoice.discountTotal),
      taxTotal: money(invoice.taxTotal),
      total: money(invoice.total),
      lines: invoice.lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: money(l.unitPrice),
        discount: money(l.discount),
        amount: money(l.amount),
      })),
    });

    try {
      const { via } = await sendEmail({ to: invoice.customer.email, subject, html });
      return { ok: true, data: { to: invoice.customer.email, via } };
    } catch (error) {
      return { ok: false, message: `Could not send the email: ${(error as Error).message}` };
    }
  });
}
