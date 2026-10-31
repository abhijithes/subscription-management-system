import { Suspense } from "react";
import type { Metadata } from "next";
import { Container, Grid, GridCol, Stack, Text, Title } from "@mantine/core";
import { AccessDenied } from "@/components/access-denied";
import { RuleError } from "@/lib/errors";
import { dashboardFilterSchema } from "@/lib/validation/dashboard";
import { getDashboard } from "@/server/services/dashboard";
import { DashboardFilters } from "./dashboard-filters";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { FiguresStrip } from "./figures";
import { OverdueTable, PaymentsTable } from "./tables";

export const metadata: Metadata = { title: "Dashboard" };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default function DashboardPage({ searchParams }: { searchParams: Search }) {
  return (
    <Container size="xl" py="lg" w="100%">
      <Stack gap="lg">
        <Title order={2}>Dashboard</Title>
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent searchParams={searchParams} />
        </Suspense>
      </Stack>
    </Container>
  );
}

async function DashboardContent({ searchParams }: { searchParams: Search }) {
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const filters = dashboardFilterSchema.parse(raw);

  let data;
  try {
    data = await getDashboard(filters);
  } catch (error) {
    if (error instanceof RuleError) return <AccessDenied />;
    throw error;
  }

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <DashboardFilters {...filters} plans={data.options.plans} customers={data.options.customers} />
        <Text size="xs" c="dimmed">
          As of {data.asOf}. The date range applies to invoice dates and payment dates; active subscriptions are always today&apos;s.
        </Text>
      </Stack>
      <FiguresStrip figures={data.figures} />
      <Grid gap="lg">
        <GridCol span={{ base: 12, md: 7 }}>
          <OverdueTable rows={data.overdueInvoices} total={data.figures.overdueCount} />
        </GridCol>
        <GridCol span={{ base: 12, md: 5 }}>
          <PaymentsTable rows={data.recentPayments} />
        </GridCol>
      </Grid>
    </Stack>
  );
}
