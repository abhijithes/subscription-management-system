import { z } from "zod";

/** Where a billing run continues from: the last subscription id of the previous chunk. */
export const cursorSchema = z.string().trim().min(1).max(100).nullable().optional();

export const billingRouteParams = z.object({
  cursor: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
