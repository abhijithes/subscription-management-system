import { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/errors";
import { rankEligibleRules } from "@/lib/discount";
import { toMoney } from "@/lib/money";
import { periodAfter, utcDay } from "@/lib/period";
import { priceInvoice, type AppliedDiscount, type LineInput } from "@/lib/pricing";
import { cursorSchema } from "@/lib/validation/billing";
import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth/require-role";
import { denyUnlessRole, invalid } from "./guard";

const DAY_MS = 24 * 60 * 60 * 1000;
const INVOICE_NUMBER_LOCK = 7002;

export type BillingFailure = { subscriptionId: string; number: string; reason: string };

/**
 * `created` counts invoices (a subscription several periods behind makes one per period),
 * `skipped` counts subscriptions that were already billed or that another run holds.
 */
export type BillingChunk = {
  created: number;
  skipped: number;
  failed: BillingFailure[];
  nextCursor: string | null;
};

export type BillingOptions = {
  today: Date;
  /** The last subscription id of the previous chunk. */
  cursor?: string;
  limit?: number;
  /** Bill only these subscriptions. Used for "bill this one" and for safe testing. */
  only?: string[];
};

/** A reason shown in the run report, with nothing created for that subscription. */
class BillingFailureError extends Error {}
/** The period turned out to be billed already; rolls the subscription's transaction back. */
class AlreadyBilled extends Error {}

type Tx = Prisma.TransactionClient;
type Counter = { next: number | null };

/**
 * Bills every due subscription, one chunk at a time. Callers check the user's role (or the
 * service secret) first. Each subscription commits on its own, so one failure never stops the rest.
 */
export async function runBilling({ today, cursor, limit = 50, only }: BillingOptions): Promise<BillingChunk> {
  const day = utcDay(today);
  const size = Math.min(Math.max(Math.floor(limit), 1), 200);

  const due = await prisma.$queryRaw<{ id: string; number: string }[]>(Prisma.sql`
    SELECT "id", "number" FROM "Subscription"
    WHERE "status" = 'ACTIVE' AND NOT "isPaused"
      AND "nextBillingDate" <= ${day} AND "nextBillingDate" <= "expiryDate"
      ${cursor ? Prisma.sql`AND "id" > ${cursor}` : Prisma.empty}
      ${only ? Prisma.sql`AND "id" = ANY(${only}::text[])` : Prisma.empty}
    ORDER BY "id"
    LIMIT ${size}`);

  let created = 0;
  let skipped = 0;
  const failed: BillingFailure[] = [];
  for (const { id, number } of due) {
    try {
      const result = await billSubscription(id, day);
      created += result.invoices;
      if (result.skipped) skipped++;
    } catch (error) {
      if (error instanceof AlreadyBilled) skipped++;
      else {
        const reason =
          error instanceof BillingFailureError ? error.message : `Unexpected error: ${(error as Error).message}`;
        failed.push({ subscriptionId: id, number, reason });
      }
    }
  }

  return { created, skipped, failed, nextCursor: due.length === size ? due[due.length - 1].id : null };
}

/** One subscription in one transaction: every missed period up to `today`, then move the billing date on. */
async function billSubscription(id: string, today: Date): Promise<{ invoices: number; skipped: boolean }> {
  return prisma.$transaction(
    async (tx) => {
      // A second run that reaches this row while we hold it gets nothing back and skips it.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Subscription"
        WHERE "id" = ${id} AND "status" = 'ACTIVE' AND NOT "isPaused" AND "nextBillingDate" <= ${today}
        FOR UPDATE SKIP LOCKED`;
      if (locked.length === 0) return { invoices: 0, skipped: true };

      const sub = await tx.subscription.findUniqueOrThrow({
        where: { id },
        include: {
          plan: true,
          lines: {
            orderBy: { id: "asc" },
            include: {
              product: { select: { name: true } },
              variant: { select: { attribute: true, value: true } },
              tax: true,
            },
          },
        },
      });
      if (sub.lines.length === 0) throw new BillingFailureError("The subscription has no lines");
      if (!sub.nextBillingDate) throw new BillingFailureError("The subscription has no next billing date");

      const lines: LineInput[] = sub.lines.map((l) => ({
        productId: l.productId,
        description: l.variant ? `${l.product.name} (${l.variant.attribute}: ${l.variant.value})` : l.product.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxName: l.tax?.name ?? null,
        taxRatePercent: l.tax?.ratePercent ?? toMoney(0),
      }));

      const scheduleStart = utcDay(sub.startDate);
      const expiry = utcDay(sub.expiryDate);
      const counter: Counter = { next: null };
      let periodStart = utcDay(sub.nextBillingDate);
      let invoices = 0;
      while (periodStart <= today && periodStart <= expiry) {
        const periodEnd = periodAfter(scheduleStart, sub.plan.billingPeriod, periodStart);
        const billed = await tx.invoice.findFirst({
          where: { subscriptionId: id, periodStart },
          select: { id: true },
        });
        if (!billed) {
          await createInvoice(tx, counter, { subscription: sub, lines, periodStart, periodEnd });
          invoices++;
        }
        periodStart = periodEnd;
      }

      // Past the expiry the plan decides: close it, or leave it ACTIVE (shown as expired) for staff.
      const closeNow = periodStart > expiry && sub.plan.autoClose;
      await tx.subscription.update({
        where: { id },
        data: closeNow ? { status: "CLOSED", nextBillingDate: null } : { nextBillingDate: periodStart },
      });
      return { invoices, skipped: invoices === 0 };
    },
    { timeout: 30_000, maxWait: 10_000 },
  );
}

async function createInvoice(
  tx: Tx,
  counter: Counter,
  input: {
    subscription: { id: string; customerId: string; paymentTermsDays: number };
    lines: LineInput[];
    periodStart: Date;
    periodEnd: Date;
  },
) {
  const { subscription, lines, periodStart, periodEnd } = input;
  const invoiceDate = periodStart;

  const discount = await claimDiscount(tx, lines, invoiceDate);
  const priced = priceInvoice(lines, discount);
  const number = await nextInvoiceNumber(tx, counter);

  const { count } = await tx.invoice.createMany({
    data: [
      {
        number,
        subscriptionId: subscription.id,
        customerId: subscription.customerId,
        periodStart,
        periodEnd,
        revision: 1,
        status: "DRAFT",
        invoiceDate,
        dueDate: new Date(invoiceDate.getTime() + subscription.paymentTermsDays * DAY_MS),
        subtotal: priced.subtotal,
        discountTotal: priced.discountTotal,
        taxTotal: priced.taxTotal,
        total: priced.total,
      },
    ],
    skipDuplicates: true, // INSERT ... ON CONFLICT DO NOTHING on (subscription, period, revision)
  });
  if (count === 0) throw new AlreadyBilled(); // also rolls back the discount use claimed above

  const invoice = await tx.invoice.findUniqueOrThrow({
    where: { subscriptionId_periodStart_revision: { subscriptionId: subscription.id, periodStart, revision: 1 } },
    select: { id: true },
  });
  await tx.invoiceLine.createMany({
    data: priced.lines.map((l) => ({
      invoiceId: invoice.id,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxName: l.taxName,
      taxRatePercent: l.taxRatePercent,
      discount: l.discount,
      amount: l.amount,
    })),
  });
  if (discount) {
    await tx.invoiceDiscount.create({ data: { invoiceId: invoice.id, discountRuleId: discount.ruleId } });
  }
}

/**
 * The best eligible rule, with one use claimed. The claim only succeeds while `usedCount < usageLimit`,
 * so when two invoices race for the last use the loser gets zero rows and falls back to the next rule.
 */
async function claimDiscount(tx: Tx, lines: LineInput[], invoiceDate: Date): Promise<AppliedDiscount | null> {
  const rules = await tx.discountRule.findMany({
    where: { startsAt: { lte: invoiceDate }, endsAt: { gte: invoiceDate } },
  });
  for (const { rule } of rankEligibleRules(rules, lines, invoiceDate)) {
    const claimed = await tx.$executeRaw`
      UPDATE "DiscountRule" SET "usedCount" = "usedCount" + 1
      WHERE "id" = ${rule.id} AND "usedCount" < "usageLimit"`;
    if (claimed === 1) {
      return { ruleId: rule.id, type: rule.type, value: rule.value, appliesTo: rule.appliesTo, productId: rule.productId };
    }
  }
  return null;
}

/** INV-00001 style. One writer at a time takes numbers, so they are unique and sequential. */
async function nextInvoiceNumber(tx: Tx, counter: Counter): Promise<string> {
  if (counter.next === null) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${INVOICE_NUMBER_LOCK}::bigint)`;
    const [{ latest }] = await tx.$queryRaw<{ latest: number | null }[]>`
      SELECT MAX(CAST(SUBSTRING("number" FROM 5) AS INTEGER)) AS latest FROM "Invoice"`;
    counter.next = (latest ?? 0) + 1;
  }
  return `INV-${String(counter.next++).padStart(5, "0")}`;
}

/** Subscriptions a run would bill today. */
export async function getDueCount(): Promise<number> {
  await requireRole("ADMIN", "STAFF");
  const [{ due }] = await prisma.$queryRaw<{ due: number }[]>`
    SELECT COUNT(*)::int AS due FROM "Subscription"
    WHERE "status" = 'ACTIVE' AND NOT "isPaused"
      AND "nextBillingDate" <= ${utcDay(new Date())} AND "nextBillingDate" <= "expiryDate"`;
  return due;
}

/**
 * One chunk of a run for a signed-in user. Today comes from the server clock, never from the
 * client, so nobody can bill future periods early.
 */
export async function runBillingChunk(cursor?: string | null): Promise<ActionResult<BillingChunk>> {
  const denied = await denyUnlessRole("ADMIN", "STAFF");
  if (denied) return denied;
  const parsed = cursorSchema.safeParse(cursor);
  if (!parsed.success) return invalid(parsed.error);
  return { ok: true, data: await runBilling({ today: new Date(), cursor: parsed.data ?? undefined }) };
}
