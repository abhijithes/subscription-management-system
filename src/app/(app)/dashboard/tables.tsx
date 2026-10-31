import { Group, Paper, Stack, TableScrollContainer, Table, TableTbody, TableTd, TableTh, TableThead, TableTr, Text, Title } from "@mantine/core";
import { AppAnchor } from "@/components/app-anchor";
import { formatAmount, formatCount } from "./format";

const numeric = { fontVariantNumeric: "tabular-nums" } as const;

type Overdue = { id: string; number: string; customer: string; dueDate: string; daysOverdue: number; total: string };
type Payment = { id: string; invoiceId: string; number: string; customer: string; method: string; amount: string; paidAt: string };

function Panel({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Paper withBorder p="lg" h="100%">
      <Stack gap="md">
        <Group justify="space-between" align="baseline" wrap="nowrap">
          <Title order={4}>{title}</Title>
          {aside}
        </Group>
        {children}
      </Stack>
    </Paper>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <Text size="sm" c="dimmed" maw="48ch">{children}</Text>;
}

export function OverdueTable({ rows, total }: { rows: Overdue[]; total: number }) {
  return (
    <Panel
      title="Overdue invoices"
      aside={
        total > 0 ? (
          <AppAnchor href="/invoices?overdue=1" size="sm">
            {total > rows.length ? `View all ${formatCount(total)}` : "Open in invoices"}
          </AppAnchor>
        ) : null
      }
    >
      {rows.length === 0 ? (
        <Empty>No overdue invoices in this view. Every unpaid invoice here is still within its payment terms.</Empty>
      ) : (
        <>
          <TableScrollContainer minWidth={300}>
            <Table verticalSpacing="xs" highlightOnHover aria-label="Overdue invoices, oldest first">
              <TableThead>
                <TableTr>
                  <TableTh>Invoice</TableTh>
                  <TableTh ta="right">Overdue</TableTh>
                  <TableTh ta="right">Amount</TableTh>
                </TableTr>
              </TableThead>
              <TableTbody>
                {rows.map((r) => (
                  <TableTr key={r.id}>
                    <TableTd>
                      <AppAnchor href={`/invoices/${r.id}`} size="sm" ff="monospace">{r.number}</AppAnchor>
                      <Text size="xs" c="dimmed">{r.customer}</Text>
                    </TableTd>
                    <TableTd ta="right" style={numeric}>
                      <Text size="sm" c="red">{r.daysOverdue} {r.daysOverdue === 1 ? "day" : "days"}</Text>
                      <Text size="xs" c="dimmed">due {r.dueDate}</Text>
                    </TableTd>
                    <TableTd ta="right" style={numeric}>{formatAmount(r.total)}</TableTd>
                  </TableTr>
                ))}
              </TableTbody>
            </Table>
          </TableScrollContainer>
          {total > rows.length && (
            <Text size="xs" c="dimmed">Showing the {rows.length} longest overdue of {formatCount(total)}.</Text>
          )}
        </>
      )}
    </Panel>
  );
}

export function PaymentsTable({ rows }: { rows: Payment[] }) {
  return (
    <Panel title="Recent payments">
      {rows.length === 0 ? (
        <Empty>No payments in this view yet. They appear here as soon as a payment is recorded against an invoice.</Empty>
      ) : (
        <TableScrollContainer minWidth={300}>
          <Table verticalSpacing="xs" highlightOnHover aria-label="Most recent payments">
            <TableThead>
              <TableTr>
                <TableTh>Date</TableTh>
                <TableTh>Invoice</TableTh>
                <TableTh ta="right">Amount</TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {rows.map((r) => (
                <TableTr key={r.id}>
                  <TableTd style={numeric}>{r.paidAt}</TableTd>
                  <TableTd>
                    <AppAnchor href={`/invoices/${r.invoiceId}`} size="sm" ff="monospace">{r.number}</AppAnchor>
                    <Text size="xs" c="dimmed">{r.customer} · {r.method.replace(/_/g, " ")}</Text>
                  </TableTd>
                  <TableTd ta="right" style={numeric}>{formatAmount(r.amount)}</TableTd>
                </TableTr>
              ))}
            </TableTbody>
          </Table>
        </TableScrollContainer>
      )}
    </Panel>
  );
}
