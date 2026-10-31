import { Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { formatAmount, formatCount, plural } from "./format";

type Figures = {
  activeSubscriptions: number;
  pausedSubscriptions: number;
  revenueReceived: string;
  paymentCount: number;
  unpaidAmount: string;
  unpaidCount: number;
  overdueCount: number;
  overdueAmount: string;
};

const numeric = { fontVariantNumeric: "tabular-nums" } as const;

function Figure({ label, value, note, tone }: { label: string; value: string; note: string; tone?: "alert" }) {
  return (
    <Stack gap={2}>
      <Text size="sm" c="dimmed">{label}</Text>
      <Text fz="1.5rem" fw={600} lh={1.2} c={tone === "alert" ? "red" : undefined} style={numeric}>{value}</Text>
      <Text size="xs" c="dimmed" style={numeric}>{note}</Text>
    </Stack>
  );
}

/** The four headline figures on one surface; red is kept for overdue, and only when there is some. */
export function FiguresStrip({ figures }: { figures: Figures }) {
  return (
    <Paper withBorder p="lg" aria-label="Summary">
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="xl" verticalSpacing="lg">
        <Figure
          label="Active subscriptions"
          value={formatCount(figures.activeSubscriptions)}
          note={figures.pausedSubscriptions > 0 ? `${formatCount(figures.pausedSubscriptions)} of them paused` : "none paused"}
        />
        <Figure
          label="Revenue received"
          value={formatAmount(figures.revenueReceived)}
          note={`from ${plural(figures.paymentCount, "payment")}`}
        />
        <Figure
          label="Unpaid invoices"
          value={formatAmount(figures.unpaidAmount)}
          note={`across ${plural(figures.unpaidCount, "invoice")}`}
        />
        <Figure
          label="Overdue invoices"
          value={formatCount(figures.overdueCount)}
          note={figures.overdueCount > 0 ? `${formatAmount(figures.overdueAmount)} past due` : "nothing past due"}
          tone={figures.overdueCount > 0 ? "alert" : undefined}
        />
      </SimpleGrid>
    </Paper>
  );
}
