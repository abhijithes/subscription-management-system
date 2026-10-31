import { toMoney } from "@/lib/money";
import type { ActionResult } from "@/lib/errors";
import { canRecordPayment } from "@/lib/status";
import { paymentSchema } from "@/lib/validation/payment";
import { requireRole } from "@/server/auth/require-role";
import { prisma } from "@/server/db";
import { denyUnlessRole, guarded, invalid } from "./guard";

/**
 * Records the payment that settles a confirmed invoice. The amount must equal the invoice total
 * (compared as decimals, so 100.1 equals 100.10), and the invoice moves to PAID in the same
 * transaction. The status change is conditional, so two submissions cannot both pay it.
 */
export async function recordPayment(input: {
  invoiceId: string;
  method: string;
  amount: string;
  paidAt: string;
  note?: string;
}): Promise<ActionResult<{ paymentId: string }>> {
  const denied = await denyUnlessRole("ADMIN", "STAFF");
  if (denied) return denied;

  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { method, amount, paidAt, note } = parsed.data;

  return guarded(async () => {
    const user = await requireRole("ADMIN", "STAFF");
    const invoice = await prisma.invoice.findUnique({ where: { id: input.invoiceId }, select: { status: true, total: true } });
    if (!invoice) return { ok: false, message: "Invoice not found" };
    if (!canRecordPayment(invoice.status)) {
      return { ok: false, message: `Payments can only be recorded against a confirmed invoice (this one is ${invoice.status.toLowerCase()})` };
    }
    if (!toMoney(amount).equals(invoice.total)) {
      return {
        ok: false,
        fieldErrors: { amount: `The payment must equal the invoice total of ${invoice.total.toFixed(2)}` },
        message: "Fix the highlighted fields",
      };
    }

    return prisma.$transaction(async (tx) => {
      const settled = await tx.invoice.updateMany({ where: { id: input.invoiceId, status: "CONFIRMED" }, data: { status: "PAID" } });
      if (settled.count !== 1) return { ok: false as const, message: "This invoice was already paid" };
      const payment = await tx.payment.create({
        data: { invoiceId: input.invoiceId, method, amount: toMoney(amount), paidAt, note: note || null, recordedById: user.id },
      });
      return { ok: true as const, data: { paymentId: payment.id } };
    });
  });
}
