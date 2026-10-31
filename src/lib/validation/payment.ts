import { z } from "zod";
import { isoDate, money } from "./fields";

export const PAYMENT_METHODS = ["CASH", "CARD", "BANK_TRANSFER", "UPI", "CHEQUE", "OTHER"] as const;

export const paymentSchema = z.object({
  method: z.enum(PAYMENT_METHODS, { message: "Pick a payment method" }),
  amount: money,
  paidAt: isoDate,
  note: z.string().trim().max(500, "Keep the note under 500 characters").optional(),
});

export type PaymentInput = z.input<typeof paymentSchema>;
