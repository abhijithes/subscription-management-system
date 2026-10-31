"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/errors";
import { addVariant, createProduct } from "@/server/services/catalog";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

export async function createProductAction(
  _previous: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const result = await createProduct({
    name: text(formData, "name"),
    type: text(formData, "type"),
    salesPrice: text(formData, "salesPrice"),
    costPrice: text(formData, "costPrice"),
    notes: text(formData, "notes"),
  });
  if (!result.ok) return result;
  revalidatePath("/products");
  redirect(`/products/${result.data.id}`);
}

export async function addVariantAction(
  productId: string,
  _previous: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const result = await addVariant(productId, {
    attribute: text(formData, "attribute"),
    value: text(formData, "value"),
    extraPrice: text(formData, "extraPrice"),
  });
  if (result.ok) revalidatePath(`/products/${productId}`);
  return result;
}
