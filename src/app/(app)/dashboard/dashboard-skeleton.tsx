import { Grid, GridCol, Group, Paper, SimpleGrid, Skeleton, Stack } from "@mantine/core";

/** The same shape as the loaded page, so nothing jumps when the figures arrive. */
export function DashboardSkeleton() {
  return (
    <Stack gap="lg" aria-busy="true" aria-label="Loading the dashboard">
      <Group gap="sm">
        <Skeleton h={54} w={270} />
        <Skeleton h={54} w={200} />
        <Skeleton h={54} w={220} />
      </Group>
      <Paper withBorder p="lg">
        <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="xl" verticalSpacing="lg">
          {[0, 1, 2, 3].map((i) => (
            <Stack key={i} gap={6}>
              <Skeleton h={14} w="55%" />
              <Skeleton h={28} w="70%" />
              <Skeleton h={12} w="45%" />
            </Stack>
          ))}
        </SimpleGrid>
      </Paper>
      <Grid gap="lg">
        {[7, 5].map((span) => (
          <GridCol key={span} span={{ base: 12, md: span }}>
            <Paper withBorder p="lg">
              <Stack gap="sm">
                <Skeleton h={22} w="40%" />
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} h={20} />
                ))}
              </Stack>
            </Paper>
          </GridCol>
        ))}
      </Grid>
    </Stack>
  );
}
