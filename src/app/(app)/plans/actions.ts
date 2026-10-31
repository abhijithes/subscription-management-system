"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/errors";
import { createPlan } from "@/server/services/catalog";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");
const checked = (formData: FormData, key: string) => formData.get(key) === "on";

export async function createPlanAction(
  _previous: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const result = await createPlan({
    name: text(formData, "name"),
    price: text(formData, "price"),
    billingPeriod: text(formData, "billingPeriod") as "DAILY",
    minQuantity: text(formData, "minQuantity"),
    availableFrom: text(formData, "availableFrom"),
    availableTo: text(formData, "availableTo"),
    autoClose: checked(formData, "autoClose"),
    allowEarlyClose: checked(formData, "allowEarlyClose"),
    allowPause: checked(formData, "allowPause"),
    allowRenew: checked(formData, "allowRenew"),
  });
  if (!result.ok) return result;
  revalidatePath("/plans");
  redirect("/plans");
}
