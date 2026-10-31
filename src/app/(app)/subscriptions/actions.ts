"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/errors";
import { createSubscription, createSubscriptionFromTemplate } from "@/server/services/subscriptions";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

function linesOf(formData: FormData) {
  try {
    const parsed: unknown = JSON.parse(text(formData, "lines"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function createSubscriptionAction(
  _previous: ActionResult<{ id: string; number: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string; number: string }>> {
  const dates = {
    startDate: text(formData, "startDate"),
    expiryDate: text(formData, "expiryDate"),
    paymentTermsDays: text(formData, "paymentTermsDays"),
  };

  const result =
    text(formData, "mode") === "template"
      ? await createSubscriptionFromTemplate(text(formData, "templateId"), text(formData, "customerId"), dates)
      : await createSubscription({
          ...dates,
          customerId: text(formData, "customerId"),
          planId: text(formData, "planId"),
          lines: linesOf(formData),
        });
  if (!result.ok) return result;
  revalidatePath("/subscriptions");
  redirect("/subscriptions");
}
