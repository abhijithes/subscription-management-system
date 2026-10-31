import { Suspense } from "react";
import {
  Badge,
  Button,
  Checkbox,
  Container,
  Group,
  NativeSelect,
  Paper,
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
import { Pagination } from "@/components/pagination";
import { RuleError } from "@/lib/errors";
import { invoiceFilterSchema } from "@/lib/validation/invoice";
import { listCustomerOptions, listInvoices } from "@/server/services/invoices";

type Search = Promise<Record<string, string | string[] | undefined>>;

const STATUS_COLOUR = { DRAFT: "gray", CONFIRMED: "indigo", PAID: "green" } as const;
const numeric = { fontVariantNumeric: "tabular-nums" } as const;

export default function InvoicesPage({ searchParams }: { searchParams: Search }) {
  return (
    <Container size="lg" py="lg" w="100%">
      <Stack gap="lg">
        <Title order={1} fz="h2">Invoices</Title>
        <Suspense
          fallback={
            <Stack gap="sm" aria-busy="true" aria-label="Loading invoices">
              <Skeleton h={54} w="60%" />
              <Skeleton h={320} />
            </Stack>
          }
        >
          <InvoiceList searchParams={searchParams} />
        </Suspense>
      </Stack>
    </Container>
  );
}

async function InvoiceList({ searchParams }: { searchParams: Search }) {
  const parsed = invoiceFilterSchema.parse(
    Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])),
  );

  let data, customers;
  try {
    [data, customers] = await Promise.all([
      listInvoices({ ...parsed, page: parsed.page ?? 1 }),
      listCustomerOptions(),
    ]);
  } catch (error) {
    if (error instanceof RuleError) return <AccessDenied />;
    throw error;
  }

  const filtered = Boolean(parsed.status || parsed.overdue || parsed.customerId);
  return (
    <Stack gap="lg">
      <form method="get">
        <Group align="flex-end" gap="sm" wrap="wrap">
          <NativeSelect
            name="status"
            label="Status"
            defaultValue={parsed.status ?? ""}
            data={[
              { value: "", label: "All statuses" },
              { value: "DRAFT", label: "Draft" },
              { value: "CONFIRMED", label: "Confirmed" },
              { value: "PAID", label: "Paid" },
            ]}
            w={{ base: "100%", sm: 170 }}
          />
          <NativeSelect
            name="customerId"
            label="Customer"
            defaultValue={parsed.customerId ?? ""}
            data={[{ value: "", label: "All customers" }, ...customers.map((c) => ({ value: c.id, label: c.name }))]}
            w={{ base: "100%", sm: 220 }}
          />
          <Checkbox name="overdue" value="1" label="Overdue only" defaultChecked={parsed.overdue} pb={8} />
          <Button type="submit">Filter</Button>
          {filtered && <AppAnchor href="/invoices" size="sm" pb={8}>Clear</AppAnchor>}
        </Group>
      </form>

      {data.total === 0 ? (
        <Text size="sm" c="dimmed" maw="48ch">
          {filtered ? "No invoices match these filters." : "No invoices yet. Run billing to create them."}
        </Text>
      ) : (
        <>
          <Paper withBorder p="md">
            <TableScrollContainer minWidth={640}>
              <Table verticalSpacing="xs" highlightOnHover aria-label="Invoices">
                <TableThead>
                  <TableTr>
                    <TableTh>Number</TableTh>
                    <TableTh>Customer</TableTh>
                    <TableTh>Status</TableTh>
                    <TableTh>Invoice date</TableTh>
                    <TableTh>Due</TableTh>
                    <TableTh ta="right">Total</TableTh>
                  </TableTr>
                </TableThead>
                <TableTbody>
                  {data.rows.map((i) => (
                    <TableTr key={i.id}>
                      <TableTd>
                        <AppAnchor href={`/invoices/${i.id}`} size="sm" ff="monospace">{i.number}</AppAnchor>
                      </TableTd>
                      <TableTd>{i.customerName}</TableTd>
                      <TableTd>
                        <Group gap={6} wrap="nowrap">
                          <Badge variant="light" color={STATUS_COLOUR[i.status]} tt="none">{i.status.toLowerCase()}</Badge>
                          {i.overdue && <Badge variant="light" color="red" tt="none">overdue</Badge>}
                        </Group>
                      </TableTd>
                      <TableTd style={numeric}>{i.invoiceDate}</TableTd>
                      <TableTd style={numeric}>{i.dueDate}</TableTd>
                      <TableTd ta="right" style={numeric}>{Number(i.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableTd>
                    </TableTr>
                  ))}
                </TableTbody>
              </Table>
            </TableScrollContainer>
          </Paper>
          <Pagination
            basePath="/invoices"
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            noun="invoices"
            query={{ status: parsed.status, customerId: parsed.customerId, overdue: parsed.overdue ? "1" : undefined }}
          />
        </>
      )}
    </Stack>
  );
}
