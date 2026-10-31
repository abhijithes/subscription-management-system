import { z } from "zod";
import { isoDate, wholeNumber } from "./fields";

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

const customerAndDates = {
  customerId: z.string().trim().min(1, "Pick a customer"),
  startDate: isoDate,
  expiryDate: isoDate,
  paymentTermsDays: wholeNumber(0, 365, "Payment terms"),
};

function expiryAfterStart(value: { startDate: Date; expiryDate: Date }, ctx: z.RefinementCtx) {
  if (value.expiryDate <= value.startDate) {
    ctx.addIssue({ code: "custom", path: ["expiryDate"], message: "Must be after the start date" });
  }
}

export const fromTemplateSchema = z
  .object({ ...customerAndDates, templateId: z.string().trim().min(1, "Pick a template") })
  .superRefine(expiryAfterStart);

export const subscriptionLineSchema = templateLineSchema.extend({
  taxId: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
});

const fromScratchSchema = z.object({
  ...customerAndDates,
  planId: z.string().trim().min(1, "Pick a plan"),
  lines: z.array(subscriptionLineSchema).min(1, "Add at least one line"),
});

/** A subscription built from scratch, with BR-09: every line meets the plan's minimum quantity. */
export function subscriptionSchemaFor(plans: { id: string; minQuantity: number }[]) {
  return fromScratchSchema.superRefine((subscription, ctx) => {
    expiryAfterStart(subscription, ctx);
    const minimum = plans.find((p) => p.id === subscription.planId)?.minQuantity ?? 1;
    if (subscription.lines.some((line) => line.quantity < minimum)) {
      ctx.addIssue({
        code: "custom",
        path: ["lines"],
        message: `Each line needs a quantity of at least ${minimum} for this plan`,
      });
    }
  });
}

export type FromTemplateInput = z.input<typeof fromTemplateSchema>;
export type SubscriptionInput = z.input<typeof fromScratchSchema>;
export type TemplateDates = Pick<FromTemplateInput, "startDate" | "expiryDate" | "paymentTermsDays">;

export const subscriptionStatusSchema = z.enum(["DRAFT", "QUOTATION", "CONFIRMED", "ACTIVE", "CLOSED"], "Unknown status");
