"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/errors";
import { confirmInvoice, sendInvoice } from "@/server/services/invoices";
import { recordPayment } from "@/server/services/payments";

export async function invoiceAction(
  id: string,
  _previous: ActionResult<unknown> | null,
  formData: FormData,
): Promise<ActionResult<unknown>> {
  const intent = String(formData.get("intent") ?? "");
  let result: ActionResult<unknown>;
  if (intent === "confirm") result = await confirmInvoice(id);
  else if (intent === "send") result = await sendInvoice(id);
  else result = { ok: false, message: "Unknown action" };

  if (result.ok && intent === "confirm") {
    revalidatePath(`/invoices/${id}`);
    revalidatePath("/invoices");
  }
  return result;
}

export async function recordPaymentAction(
  invoiceId: string,
  _previous: ActionResult<unknown> | null,
  formData: FormData,
): Promise<ActionResult<unknown>> {
  const result = await recordPayment({
    invoiceId,
    method: String(formData.get("method") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    paidAt: String(formData.get("paidAt") ?? ""),
    note: String(formData.get("note") ?? "") || undefined,
  });
  if (result.ok) {
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/invoices");
    revalidatePath("/dashboard");
  }
  return result;
}
