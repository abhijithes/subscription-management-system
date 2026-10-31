export type BillingFailureRow = { subscriptionId: string; number: string; reason: string };
export type ChunkData = { created: number; skipped: number; failed: BillingFailureRow[]; nextCursor: string | null };
export type ChunkResult = { ok: true; data: ChunkData } | { ok: false; message: string };
export type Totals = { created: number; skipped: number; chunks: number; failed: BillingFailureRow[] };
export type Outcome = { status: "finished" | "stopped" | "error"; totals: Totals; error?: string };

export const emptyTotals = (): Totals => ({ created: 0, skipped: 0, chunks: 0, failed: [] });

/**
 * Runs billing one chunk at a time until nothing is left. A stop request lets the batch in flight
 * finish (each subscription in it commits on its own) and then ends the run before the next one.
 * Whatever was billed stays billed, and a later run carries on from there.
 */
export async function runChunks(options: {
  runChunk: (cursor: string | null) => Promise<ChunkResult>;
  shouldStop: () => boolean;
  onProgress: (totals: Totals) => void;
}): Promise<Outcome> {
  let totals = emptyTotals();
  let cursor: string | null = null;
  do {
    let result: ChunkResult;
    try {
      result = await options.runChunk(cursor);
    } catch (error) {
      return { status: "error", totals, error: error instanceof Error ? error.message : "The request failed" };
    }
    if (!result.ok) return { status: "error", totals, error: result.message };

    totals = {
      created: totals.created + result.data.created,
      skipped: totals.skipped + result.data.skipped,
      chunks: totals.chunks + 1,
      failed: [...totals.failed, ...result.data.failed],
    };
    options.onProgress(totals);
    cursor = result.data.nextCursor;
    // Only a stop with work still left counts as stopped; a stop on the last batch is a finished run.
    if (cursor && options.shouldStop()) return { status: "stopped", totals };
  } while (cursor);
  return { status: "finished", totals };
}
