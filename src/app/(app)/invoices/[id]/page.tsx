import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  Badge,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  TableScrollContainer,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  Title,
} from "@mantine/core";
import { AccessDenied } from "@/components/access-denied";
import { AppAnchor } from "@/components/app-anchor";
import { RuleError } from "@/lib/errors";
import { getInvoice } from "@/server/services/invoices";
import { InvoiceActions } from "./invoice-actions";
import { PaymentForm } from "./payment-form";

const STATUS_COLOUR = { DRAFT: "gray", CONFIRMED: "indigo", PAID: "green" } as const;
const numeric = { fontVariantNumeric: "tabular-nums" } as const;
const amount = (value: string) => Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Container size="md" py="lg" w="100%">
      <Stack gap="lg">
        <Suspense
          fallback={
            <Stack gap="md" aria-busy="true" aria-label="Loading the invoice">
              <Skeleton h={34} w="40%" />
              <Skeleton h={40} w="50%" />
              <Skeleton h={220} />
            </Stack>
          }
        >
          <InvoiceDetail params={params} />
        </Suspense>
        <AppAnchor href="/invoices" size="sm">Back to invoices</AppAnchor>
      </Stack>
    </Container>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={2}>
      <Text size="sm" c="dimmed">{label}</Text>
      <Text style={numeric}>{value}</Text>
    </Stack>
  );
}

async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let invoice;
  try {
    invoice = await getInvoice(id);
  } catch (error) {
    if (error instanceof RuleError) return <AccessDenied />;
    throw error;
  }
  if (!invoice) notFound();

  return (
    <>
      <Stack gap={6}>
        <Group gap="sm" align="center">
          <Title order={1} fz="h2" ff="monospace">{invoice.number}</Title>
          <Badge variant="light" color={STATUS_COLOUR[invoice.status]} tt="none">{invoice.status.toLowerCase()}</Badge>
          {invoice.overdue && <Badge variant="light" color="red" tt="none">overdue</Badge>}
        </Group>
        <Text size="sm" c="dimmed">
          {invoice.customer.name} ({invoice.customer.email}) · subscription{" "}
          <AppAnchor href={`/subscriptions/${invoice.subscription.id}`} size="sm">{invoice.subscription.number}</AppAnchor>
        </Text>
      </Stack>

      <InvoiceActions id={invoice.id} {...invoice.actions} />

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
        <Fact label="Invoice date" value={invoice.invoiceDate} />
        <Fact label="Due date" value={invoice.dueDate} />
        <Fact label="Billing period" value={`${invoice.periodStart} to ${invoice.periodEnd}`} />
        <Fact label="Paid so far" value={amount(invoice.amountPaid)} />
      </SimpleGrid>

      <Stack gap="sm">
        <Title order={2} fz="h4">Lines</Title>
        <Paper withBorder p="md">
          <TableScrollContainer minWidth={560}>
            <Table verticalSpacing="xs" aria-label="Invoice lines">
              <TableThead>
                <TableTr>
                  <TableTh>Description</TableTh>
                  <TableTh ta="right">Qty</TableTh>
                  <TableTh ta="right">Unit price</TableTh>
                  <TableTh>Tax</TableTh>
                  <TableTh ta="right">Discount</TableTh>
                  <TableTh ta="right">Amount</TableTh>
                </TableTr>
              </TableThead>
              <TableTbody>
                {invoice.lines.length === 0 ? (
                  <TableTr>
                    <TableTd colSpan={6}><Text size="sm" c="dimmed">This invoice has no line items.</Text></TableTd>
                  </TableTr>
                ) : (
                  invoice.lines.map((l) => (
                    <TableTr key={l.id}>
                      <TableTd>{l.description}</TableTd>
                      <TableTd ta="right" style={numeric}>{l.quantity}</TableTd>
                      <TableTd ta="right" style={numeric}>{amount(l.unitPrice)}</TableTd>
                      <TableTd><Text size="sm" c="dimmed">{l.tax ?? "none"}</Text></TableTd>
                      <TableTd ta="right" style={numeric}>{amount(l.discount)}</TableTd>
                      <TableTd ta="right" style={numeric}>{amount(l.amount)}</TableTd>
                    </TableTr>
                  ))
                )}
              </TableTbody>
            </Table>
          </TableScrollContainer>
        </Paper>
        <Stack gap={4} ml="auto" w={{ base: "100%", sm: 280 }}>
          {[
            ["Subtotal", invoice.subtotal],
            [`Discount${invoice.discountNames.length > 0 ? ` (${invoice.discountNames.join(", ")})` : ""}`, invoice.discountTotal],
            ["Tax", invoice.taxTotal],
          ].map(([label, value]) => (
            <Group key={label} justify="space-between" wrap="nowrap">
              <Text size="sm" c="dimmed">{label}</Text>
              <Text size="sm" style={numeric}>{amount(value)}</Text>
            </Group>
          ))}
          <Group justify="space-between" wrap="nowrap" pt={6} style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}>
            <Text fw={600}>Total</Text>
            <Text fw={600} style={numeric}>{amount(invoice.total)}</Text>
          </Group>
        </Stack>
      </Stack>

      <Stack gap="sm">
        <Title order={2} fz="h4">Payments</Title>
        {invoice.payments.length === 0 ? (
          <Text size="sm" c="dimmed">No payments recorded.</Text>
        ) : (
          <Paper withBorder p="md">
            <Stack gap="xs">
              {invoice.payments.map((p) => (
                <Group key={p.id} justify="space-between" wrap="nowrap">
                  <Text size="sm">
                    <Text span style={numeric}>{p.paidAt}</Text> · {p.method.replace(/_/g, " ")}
                    {p.note && <Text span c="dimmed"> · {p.note}</Text>}
                  </Text>
                  <Text size="sm" style={numeric}>{amount(p.amount)}</Text>
                </Group>
              ))}
            </Stack>
          </Paper>
        )}
      </Stack>
      {invoice.status === "CONFIRMED" && <PaymentForm invoiceId={invoice.id} total={invoice.total} />}
    </>
  );
}
