import { Suspense } from "react";
import {
  Badge, Container, Group, Paper, Skeleton, Stack, Table, TableScrollContainer, TableTbody, TableTd,
  TableTh, TableThead, TableTr, Text, Title,
} from "@mantine/core";
import { AppAnchor } from "@/components/app-anchor";
import { Pagination } from "@/components/pagination";
import { listMySubscriptions } from "@/server/services/portal";
import { leavePortal } from "./portal-ui";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default function PortalPage({ searchParams }: { searchParams: Search }) {
  return (
    <Container size="lg" py="lg" w="100%">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end">
          <Title order={1} fz="h2">Your subscriptions</Title>
          <AppAnchor href="/portal/invoices" size="sm">View your invoices</AppAnchor>
        </Group>
        <Suspense fallback={<Skeleton h={240} aria-busy="true" aria-label="Loading your subscriptions" />}>
          <Subscriptions searchParams={searchParams} />
        </Suspense>
      </Stack>
    </Container>
  );
}

async function Subscriptions({ searchParams }: { searchParams: Search }) {
  const raw = (await searchParams).page;
  let data;
  try {
    data = await listMySubscriptions(Number(Array.isArray(raw) ? raw[0] : raw) || 1);
  } catch (error) {
    leavePortal(error);
  }
  if (data.total === 0) return <Text size="sm" c="dimmed" maw="48ch">You have no subscriptions yet.</Text>;

  return (
    <Stack gap="md">
      <Paper withBorder p="md">
        <TableScrollContainer minWidth={560}>
          <Table verticalSpacing="xs" aria-label="Your subscriptions">
            <TableThead>
              <TableTr>
                <TableTh>Number</TableTh>
                <TableTh>Plan</TableTh>
                <TableTh>Status</TableTh>
                <TableTh>Starts</TableTh>
                <TableTh>Expires</TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {data.rows.map((s) => (
                <TableTr key={s.id}>
                  <TableTd ff="monospace">{s.number}</TableTd>
                  <TableTd>{s.planName}</TableTd>
                  <TableTd>
                    <Group gap={6} wrap="nowrap">
                      <Badge variant="light" tt="none">{s.status.toLowerCase()}</Badge>
                      {s.isPaused && <Badge variant="light" color="yellow" tt="none">paused</Badge>}
                    </Group>
                  </TableTd>
                  <TableTd>{s.startDate}</TableTd>
                  <TableTd>{s.expiryDate}</TableTd>
                </TableTr>
              ))}
            </TableTbody>
          </Table>
        </TableScrollContainer>
      </Paper>
      <Pagination basePath="/portal" page={data.page} pageSize={data.pageSize} total={data.total} noun="subscriptions" />
    </Stack>
  );
}
