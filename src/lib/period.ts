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

/** The UTC calendar day of `d`, at midnight. */
export function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Which period of the schedule that begins at `start` starts on `current`, or null if none does. */
function periodIndex(start: Date, period: BillingPeriod, current: Date): number | null {
  const days = Math.round((current.getTime() - start.getTime()) / DAY_MS);
  if (days < 0) return null;
  const estimate = {
    DAILY: days,
    WEEKLY: Math.round(days / 7),
    MONTHLY: Math.round(days / 30.4375),
    YEARLY: Math.round(days / 365.25),
  }[period];
  for (let n = Math.max(0, estimate - 1); n <= estimate + 1; n++) {
    if (addPeriod(start, period, n).getTime() === current.getTime()) return n;
  }
  return null;
}

/**
 * The start of the period after the one starting on `current`. While `current` is on the
 * subscription's own schedule (counted from `scheduleStart`) the next start stays on it, so a
 * Jan 31 start bills Feb 28 then Mar 31. After a pause the billing date is off the schedule, so
 * the cycle simply restarts from `current`.
 */
export function periodAfter(scheduleStart: Date, period: BillingPeriod, current: Date): Date {
  const n = periodIndex(scheduleStart, period, current);
  return n === null ? addPeriod(current, period, 1) : addPeriod(scheduleStart, period, n + 1);
}
