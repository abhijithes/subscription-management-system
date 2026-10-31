import { z } from "zod";

const money = z
  .string()
  .trim()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter an amount like 10 or 10.50");

export const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  type: z.string().trim().min(1, "Type is required").max(60),
  salesPrice: money,
  costPrice: money,
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => v || undefined),
});

export const variantSchema = z.object({
  attribute: z.string().trim().min(1, "Attribute is required").max(60),
  value: z.string().trim().min(1, "Value is required").max(60),
  extraPrice: z
    .string()
    .trim()
    .transform((v) => (v === "" ? "0" : v))
    .pipe(money),
});

export type ProductInput = z.input<typeof productSchema>;
export type VariantInput = z.input<typeof variantSchema>;
