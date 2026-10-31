"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/errors";
import { createTax } from "@/server/services/catalog";

export async function createTaxAction(
  _previous: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const result = await createTax({
    name: String(formData.get("name") ?? ""),
    ratePercent: String(formData.get("ratePercent") ?? ""),
  });
  if (result.ok) revalidatePath("/taxes");
  return result;
}
