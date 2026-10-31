"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/errors";
import { createDiscountRule } from "@/server/services/catalog";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

export async function createDiscountRuleAction(
  _previous: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const result = await createDiscountRule({
    name: text(formData, "name"),
    type: text(formData, "type") as "FIXED",
    value: text(formData, "value"),
    minPurchase: text(formData, "minPurchase"),
    minQuantity: text(formData, "minQuantity"),
    startsAt: text(formData, "startsAt"),
    endsAt: text(formData, "endsAt"),
    usageLimit: text(formData, "usageLimit"),
    appliesTo: text(formData, "appliesTo") as "PRODUCT",
    productId: text(formData, "productId"),
  });
  if (!result.ok) return result;
  revalidatePath("/discounts");
  redirect("/discounts");
}
