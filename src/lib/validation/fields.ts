import { z } from "zod";

/** An amount with up to two decimals, kept as text until the service turns it into a Decimal. */
export const money = z
  .string()
  .trim()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter an amount like 10 or 10.50");

/** A `YYYY-MM-DD` date (from `<input type="date">`) as a UTC midnight Date. */
export const isoDate = z
  .string()
  .trim()
  .refine(
    (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v),
    "Pick a valid date",
  )
  .transform((v) => new Date(`${v}T00:00:00Z`));

export const wholeNumber = (min: number, max: number, label: string) =>
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
