"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/errors";
import { createTemplate } from "@/server/services/subscriptions";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

function linesOf(formData: FormData) {
  try {
    const parsed: unknown = JSON.parse(text(formData, "lines"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function createTemplateAction(
  _previous: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const result = await createTemplate({
    name: text(formData, "name"),
    planId: text(formData, "planId"),
    validityDays: text(formData, "validityDays"),
    lines: linesOf(formData),
  });
  if (!result.ok) return result;
  revalidatePath("/templates");
  redirect("/templates");
}
