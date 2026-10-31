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

const isoDate = z
  .string()
  .trim()
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v), "Pick a valid date")
  .transform((v) => new Date(`${v}T00:00:00Z`));

export const BILLING_PERIODS = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;

export const planSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    price: money,
    billingPeriod: z.enum(BILLING_PERIODS, "Pick a billing period"),
    minQuantity: z
      .string()
      .trim()
      .regex(/^\d+$/, "Enter a whole number")
      .transform(Number)
      .pipe(z.number().min(1, "Minimum quantity must be at least 1")),
    availableFrom: isoDate,
    availableTo: isoDate,
    autoClose: z.boolean().default(false),
    allowEarlyClose: z.boolean().default(false),
    allowPause: z.boolean().default(false),
    allowRenew: z.boolean().default(false),
  })
  .superRefine((plan, ctx) => {
    if (plan.availableTo < plan.availableFrom) {
      ctx.addIssue({ code: "custom", path: ["availableTo"], message: "Must not be before the start date" });
    }
  });

export const taxSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  ratePercent: z
    .string()
    .trim()
    .regex(/^\d{1,3}(\.\d{1,2})?$/, "Enter a rate like 10 or 7.5")
    .refine((v) => Number(v) <= 100, "Rate cannot be more than 100"),
});

export type PlanInput = z.input<typeof planSchema>;
export type TaxInput = z.input<typeof taxSchema>;
