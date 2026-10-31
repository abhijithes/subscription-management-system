import { z } from "zod";

/** What `/invoices` accepts in its query string. Anything unusable is simply ignored. */
export const invoiceFilterSchema = z.object({
  status: z.enum(["DRAFT", "CONFIRMED", "PAID"]).optional().catch(undefined),
  overdue: z
    .literal("1")
    .transform(() => true)
    .optional()
    .catch(undefined),
  customerId: z.string().trim().min(1).max(100).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});

export type InvoiceFilters = {
  status?: "DRAFT" | "CONFIRMED" | "PAID";
  overdue?: boolean;
  customerId?: string;
  page: number;
};
