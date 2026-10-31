"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BillingFailure } from "@/server/services/billing";
import { runBillingAction } from "./actions";

const SHOWN_FAILURES = 100;

type Totals = { created: number; skipped: number; chunks: number; failed: BillingFailure[] };

export function BillingRunner({ due }: { due: number }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  async function run() {
    if (!confirm(`Create invoices for ${due} due subscription${due === 1 ? "" : "s"}?`)) return;
    setRunning(true);
    setFinished(false);
    setError(null);
    let totalsSoFar: Totals = { created: 0, skipped: 0, chunks: 0, failed: [] };
    setTotals(totalsSoFar);

    let cursor: string | null = null;
    do {
      const result = await runBillingAction(cursor);
      if (!result.ok) {
        setError(result.message);
        break;
      }
      totalsSoFar = {
        created: totalsSoFar.created + result.data.created,
        skipped: totalsSoFar.skipped + result.data.skipped,
        chunks: totalsSoFar.chunks + 1,
        failed: [...totalsSoFar.failed, ...result.data.failed],
      };
      setTotals(totalsSoFar);
      cursor = result.data.nextCursor;
      if (!cursor) setFinished(true);
    } while (cursor);

    setRunning(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <p className="text-sm">
          <span className="text-2xl font-semibold">{due}</span>{" "}
          <span className="text-zinc-400">subscription{due === 1 ? "" : "s"} due for billing today</span>
        </p>
        <button
          onClick={run}
          disabled={running || due === 0}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {running ? "Running..." : "Run billing"}
        </button>
        {due === 0 && !totals && <p className="text-sm text-zinc-400">Nothing is due.</p>}
      </section>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {totals && (
        <section className="space-y-3" aria-live="polite">
          <h2 className="text-lg font-medium">{finished ? "Run complete" : running ? "In progress" : "Run stopped"}</h2>
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div><dt className="text-zinc-400">Invoices created</dt><dd className="text-xl font-semibold">{totals.created}</dd></div>
            <div><dt className="text-zinc-400">Skipped (already billed)</dt><dd className="text-xl font-semibold">{totals.skipped}</dd></div>
            <div><dt className="text-zinc-400">Failed</dt><dd className="text-xl font-semibold">{totals.failed.length}</dd></div>
          </dl>
          {totals.failed.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Failures</h3>
              <ul className="divide-y divide-zinc-800 rounded-md border border-zinc-800 text-sm">
                {totals.failed.slice(0, SHOWN_FAILURES).map((f) => (
                  <li key={f.subscriptionId} className="flex justify-between gap-4 px-4 py-2">
                    <Link href={`/subscriptions/${f.subscriptionId}`} className="font-mono underline">{f.number}</Link>
                    <span className="text-red-400">{f.reason}</span>
                  </li>
                ))}
              </ul>
              {totals.failed.length > SHOWN_FAILURES && (
                <p className="text-sm text-zinc-400">Showing the first {SHOWN_FAILURES} of {totals.failed.length}.</p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
