"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/errors";
import { runBillingChunk, type BillingChunk } from "@/server/services/billing";

/** Runs one chunk; the page calls this again with `nextCursor` until it is null. */
export async function runBillingAction(cursor: string | null): Promise<ActionResult<BillingChunk>> {
  const result = await runBillingChunk(cursor);
  if (result.ok && result.data.created > 0) {
    revalidatePath("/billing");
    revalidatePath("/subscriptions");
  }
  return result;
}
