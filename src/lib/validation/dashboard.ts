import { z } from "zod";

/** A real calendar day as `YYYY-MM-DD`. Something like 2026-02-31 is rejected, not thrown on. */
const isRealDay = (v: string) => {
  const parsed = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(v);
};

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isRealDay)
  .optional()
  .catch(undefined);

const id = z.string().trim().min(1).max(100).optional().catch(undefined);

/**
 * What `/dashboard` accepts in its query string. Anything unusable is ignored, and a reversed
 * date range is put the right way round.
 */
export const dashboardFilterSchema = z
  .object({ from: day, to: day, planId: id, customerId: id })
  .transform(({ from, to, ...rest }) => (from && to && from > to ? { ...rest, from: to, to: from } : { ...rest, from, to }));

export type DashboardFilters = z.output<typeof dashboardFilterSchema>;
