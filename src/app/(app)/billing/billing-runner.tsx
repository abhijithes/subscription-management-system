"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { AppAnchor } from "@/components/app-anchor";
import { emptyTotals, runChunks, type Outcome, type Totals } from "@/lib/billing-loop";
import { runBillingAction } from "./actions";

const SHOWN_FAILURES = 100;
const numeric = { fontVariantNumeric: "tabular-nums" } as const;
const count = (n: number) => n.toLocaleString("en-US");

type Phase = "idle" | "running" | "stopping";

export function BillingRunner({ due }: { due: number }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [totals, setTotals] = useState<Totals | null>(null);
  const [outcome, setOutcome] = useState<Outcome["status"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stopRequested = useRef(false);
  const running = phase !== "idle";

  async function run() {
    if (!confirm(`Create invoices for ${due} due subscription${due === 1 ? "" : "s"}?`)) return;
    stopRequested.current = false;
    setPhase("running");
    setOutcome(null);
    setError(null);
    setTotals(emptyTotals());

    const result = await runChunks({
      runChunk: runBillingAction,
      shouldStop: () => stopRequested.current,
      onProgress: setTotals,
    });
    setTotals(result.totals);
    setOutcome(result.status);
    setError(result.error ?? null);
    setPhase("idle");
    router.refresh(); // the due count above catches up with what was billed
  }

  function stop() {
    stopRequested.current = true;
    setPhase("stopping");
  }

  const heading = phase === "running" ? "In progress" : phase === "stopping" ? "Stopping" : outcome === "finished" ? "Run complete" : outcome === "stopped" ? "Run stopped" : "Run stopped by an error";

  return (
    <Stack gap="xl">
      <Stack gap="sm">
        <Text>
          <Text span fz="1.75rem" fw={600} style={numeric}>{count(due)}</Text>{" "}
          <Text span c="dimmed">subscription{due === 1 ? "" : "s"} due for billing today</Text>
        </Text>
        <Group gap="sm">
          <Button onClick={run} disabled={running || due === 0} loading={phase === "running"}>
            Run billing
          </Button>
          {running && (
            <Button variant="default" color="red" onClick={stop} disabled={phase === "stopping"}>
              {phase === "stopping" ? "Stopping..." : "Stop billing"}
            </Button>
          )}
        </Group>
        {phase === "stopping" && (
          <Text size="sm" c="dimmed" role="status" maw="60ch">
            Finishing the batch in progress, then stopping. Invoices already created are kept, and running billing again carries on from here.
          </Text>
        )}
        {due === 0 && !totals && <Text size="sm" c="dimmed">Nothing is due.</Text>}
      </Stack>

      {error && <Text size="sm" c="red" role="alert">{error}</Text>}

      {totals && (
        <Stack gap="md" aria-live="polite">
          <Title order={2} fz="h4">{heading}</Title>
          <SimpleGrid cols={3} maw={520}>
            {[
              ["Invoices created", totals.created],
              ["Skipped (already billed)", totals.skipped],
              ["Failed", totals.failed.length],
            ].map(([label, value]) => (
              <Stack key={label} gap={2}>
                <Text size="sm" c="dimmed">{label}</Text>
                <Text fz="1.4rem" fw={600} style={numeric}>{count(Number(value))}</Text>
              </Stack>
            ))}
          </SimpleGrid>
          {outcome === "stopped" && (
            <Text size="sm" c="dimmed" maw="60ch">
              Stopped after {count(totals.chunks)} {totals.chunks === 1 ? "batch" : "batches"}. The count above shows what is still due.
            </Text>
          )}
          {totals.failed.length > 0 && (
            <Stack gap="xs">
              <Title order={3} fz="sm">Failures</Title>
              <Paper withBorder p="sm">
                <Stack gap="xs">
                  {totals.failed.slice(0, SHOWN_FAILURES).map((f) => (
                    <Group key={f.subscriptionId} justify="space-between" wrap="nowrap" align="flex-start">
                      <AppAnchor href={`/subscriptions/${f.subscriptionId}`} size="sm" ff="monospace">{f.number}</AppAnchor>
                      <Text size="sm" c="red" ta="right">{f.reason}</Text>
                    </Group>
                  ))}
                </Stack>
              </Paper>
              {totals.failed.length > SHOWN_FAILURES && (
                <Text size="sm" c="dimmed">Showing the first {SHOWN_FAILURES} of {count(totals.failed.length)}.</Text>
              )}
            </Stack>
          )}
        </Stack>
      )}
    </Stack>
  );
}
