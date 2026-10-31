import type { BillingPeriod } from "@/generated/prisma/enums";

const DAY_MS = 24 * 60 * 60 * 1000;

function addMonths(start: Date, months: number): Date {
  const total = start.getUTCFullYear() * 12 + start.getUTCMonth() + months;
  const year = Math.floor(total / 12);
  const month = total % 12;
  const daysInTarget = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(start.getUTCDate(), daysInTarget)));
}

/**
 * Start of the nth period after `start`, as a UTC date. Always counted from the original
 * start so month-end anchors don't drift (Jan 31, Feb 28, Mar 31).
 */
export function addPeriod(start: Date, period: BillingPeriod, n: number): Date {
  const base = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  switch (period) {
    case "DAILY":
      return new Date(base.getTime() + n * DAY_MS);
    case "WEEKLY":
      return new Date(base.getTime() + n * 7 * DAY_MS);
    case "MONTHLY":
      return addMonths(base, n);
    case "YEARLY":
      return addMonths(base, n * 12);
  }
}
