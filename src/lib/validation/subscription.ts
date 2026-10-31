import { z } from "zod";

const wholeNumber = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, "Enter a whole number")
    .transform(Number)
    .pipe(
      z
        .number()
        .min(min, `${label} must be at least ${min}`)
        .max(max, `${label} cannot be more than ${max}`),
    );

export const templateLineSchema = z.object({
  productId: z.string().trim().min(1, "Pick a product"),
  variantId: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  quantity: wholeNumber(1, 100000, "Quantity"),
});

export const templateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  planId: z.string().trim().min(1, "Pick a plan"),
  validityDays: wholeNumber(1, 3650, "Validity"),
  lines: z.array(templateLineSchema).min(1, "Add at least one line"),
});

/** The template schema plus BR-09: every line meets the chosen plan's minimum quantity. */
export function templateSchemaFor(plans: { id: string; minQuantity: number }[]) {
  return templateSchema.superRefine((template, ctx) => {
    const minimum = plans.find((p) => p.id === template.planId)?.minQuantity ?? 1;
    if (template.lines.some((line) => line.quantity < minimum)) {
      ctx.addIssue({
        code: "custom",
        path: ["lines"],
        message: `Each line needs a quantity of at least ${minimum} for this plan`,
      });
    }
  });
}

export type TemplateInput = z.input<typeof templateSchema>;
