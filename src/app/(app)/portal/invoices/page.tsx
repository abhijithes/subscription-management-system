import { Suspense } from "react";
import {
  Badge, Container, Group, Paper, Skeleton, Stack, Table, TableScrollContainer, TableTbody, TableTd,
  TableTh, TableThead, TableTr, Text, Title,
} from "@mantine/core";
import { AppAnchor } from "@/components/app-anchor";
import { Pagination } from "@/components/pagination";
import { listMyInvoices } from "@/server/services/portal";
import { STATUS_COLOUR, amount, leavePortal, numeric } from "../portal-ui";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default function PortalInvoicesPage({ searchParams }: { searchParams: Search }) {
  return (
    <Container size="lg" py="lg" w="100%">
      <Stack gap="lg">
        <Title order={1} fz="h2">Your invoices</Title>
        <Suspense fallback={<Skeleton h={240} aria-busy="true" aria-label="Loading your invoices" />}>
          <Invoices searchParams={searchParams} />
        </Suspense>
        <AppAnchor href="/portal" size="sm">Back to your subscriptions</AppAnchor>
      </Stack>
    </Container>
  );
}

async function Invoices({ searchParams }: { searchParams: Search }) {
  const raw = (await searchParams).page;
  let data;
  try {
    data = await listMyInvoices(Number(Array.isArray(raw) ? raw[0] : raw) || 1);
  } catch (error) {
    leavePortal(error);
  }
  if (data.total === 0) return <Text size="sm" c="dimmed" maw="48ch">You have no invoices yet.</Text>;

  return (
    <Stack gap="md">
      <Paper withBorder p="md">
        <TableScrollContainer minWidth={560}>
          <Table verticalSpacing="xs" highlightOnHover aria-label="Your invoices">
            <TableThead>
              <TableTr>
                <TableTh>Number</TableTh>
                <TableTh>Status</TableTh>
                <TableTh>Invoice date</TableTh>
                <TableTh>Due</TableTh>
                <TableTh ta="right">Total</TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {data.rows.map((i) => (
                <TableTr key={i.id}>
                  <TableTd><AppAnchor href={`/portal/invoices/${i.id}`} size="sm" ff="monospace">{i.number}</AppAnchor></TableTd>
                  <TableTd>
                    <Group gap={6} wrap="nowrap">
                      <Badge variant="light" color={STATUS_COLOUR[i.status]} tt="none">{i.status.toLowerCase()}</Badge>
                      {i.overdue && <Badge variant="light" color="red" tt="none">overdue</Badge>}
                    </Group>
                  </TableTd>
                  <TableTd>{i.invoiceDate}</TableTd>
                  <TableTd>{i.dueDate}</TableTd>
                  <TableTd ta="right" style={numeric}>{amount(i.total)}</TableTd>
                </TableTr>
              ))}
            </TableTbody>
          </Table>
        </TableScrollContainer>
      </Paper>
      <Pagination basePath="/portal/invoices" page={data.page} pageSize={data.pageSize} total={data.total} noun="invoices" />
    </Stack>
  );
}
