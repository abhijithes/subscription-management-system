import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { billingRouteParams } from "@/lib/validation/billing";
import { runBilling, type BillingFailure } from "@/server/services/billing";

const TIME_BUDGET_MS = 50_000;
const MAX_FAILURES_RETURNED = 200;

function secretMatches(given: string, expected: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

/**
 * Scheduled billing: POST with the header `x-billing-secret`. Runs chunks until nothing is due, or
 * until the time budget is spent, in which case `nextCursor` says where to continue.
 */
export async function POST(request: Request) {
  const expected = process.env.BILLING_CRON_SECRET;
  const given = request.headers.get("x-billing-secret");
  // An unset secret must never act as "no password".
  if (!expected || !given || !secretMatches(given, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = billingRouteParams.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid parameters", issues: parsed.error.issues }, { status: 400 });
  }

  const startedAt = Date.now();
  let cursor: string | undefined = parsed.data.cursor;
  let created = 0;
  let skipped = 0;
  const failed: BillingFailure[] = [];
  let nextCursor: string | null = null;
  do {
    const chunk = await runBilling({ today: new Date(), cursor, limit: parsed.data.limit });
    created += chunk.created;
    skipped += chunk.skipped;
    failed.push(...chunk.failed);
    nextCursor = chunk.nextCursor;
    cursor = nextCursor ?? undefined;
  } while (nextCursor && Date.now() - startedAt < TIME_BUDGET_MS);

  return NextResponse.json({
    created,
    skipped,
    failedCount: failed.length,
    failed: failed.slice(0, MAX_FAILURES_RETURNED),
    complete: nextCursor === null,
    nextCursor,
  });
}
