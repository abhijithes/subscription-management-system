"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/errors";
import { confirmInvoice, sendInvoice } from "@/server/services/invoices";

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
