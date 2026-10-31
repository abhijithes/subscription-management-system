import { Suspense } from "react";
import {
  Badge, Container, Group, Paper, SimpleGrid, Skeleton, Stack, Table, TableScrollContainer, TableTbody,
  TableTd, TableTh, TableThead, TableTr, Text, Title,
} from "@mantine/core";
import { AppAnchor } from "@/components/app-anchor";
import { getMyInvoice } from "@/server/services/portal";
import { STATUS_COLOUR, amount, leavePortal, numeric } from "../../portal-ui";

export default function PortalInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Container size="md" py="lg" w="100%">
      <Stack gap="lg">
        <Suspense fallback={<Skeleton h={320} aria-busy="true" aria-label="Loading the invoice" />}>
          <Detail params={params} />
        </Suspense>
        <AppAnchor href="/portal/invoices" size="sm">Back to your invoices</AppAnchor>
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

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let invoice;
  try {
    invoice = await getMyInvoice(id);
  } catch (error) {
    leavePortal(error);
  }

  return (
    <>
      <Stack gap={6}>
        <Group gap="sm" align="center">
          <Title order={1} fz="h2" ff="monospace">{invoice.number}</Title>
          <Badge variant="light" color={STATUS_COLOUR[invoice.status]} tt="none">{invoice.status.toLowerCase()}</Badge>
          {invoice.overdue && <Badge variant="light" color="red" tt="none">overdue</Badge>}
        </Group>
        <Text size="sm" c="dimmed">Subscription {invoice.subscriptionNumber}</Text>
      </Stack>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
        <Fact label="Invoice date" value={invoice.invoiceDate} />
        <Fact label="Due date" value={invoice.dueDate} />
        <Fact label="Billing period" value={`${invoice.periodStart} to ${invoice.periodEnd}`} />
        <Fact label="Paid so far" value={amount(invoice.amountPaid)} />
      </SimpleGrid>

      <Paper withBorder p="md">
        <TableScrollContainer minWidth={480}>
          <Table verticalSpacing="xs" aria-label="Invoice lines">
            <TableThead>
              <TableTr>
                <TableTh>Description</TableTh>
                <TableTh ta="right">Qty</TableTh>
                <TableTh ta="right">Unit price</TableTh>
                <TableTh ta="right">Discount</TableTh>
                <TableTh ta="right">Amount</TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {invoice.lines.map((l) => (
                <TableTr key={l.id}>
                  <TableTd>{l.description}</TableTd>
                  <TableTd ta="right" style={numeric}>{l.quantity}</TableTd>
                  <TableTd ta="right" style={numeric}>{amount(l.unitPrice)}</TableTd>
                  <TableTd ta="right" style={numeric}>{amount(l.discount)}</TableTd>
                  <TableTd ta="right" style={numeric}>{amount(l.amount)}</TableTd>
                </TableTr>
              ))}
            </TableTbody>
          </Table>
        </TableScrollContainer>
      </Paper>
      <Stack gap={4} ml="auto" w={{ base: "100%", sm: 280 }}>
        {[["Subtotal", invoice.subtotal], ["Discount", invoice.discountTotal], ["Tax", invoice.taxTotal]].map(([label, value]) => (
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
    </>
  );
}
