import "@mantine/core/styles.layer.css";
import "@mantine/dates/styles.layer.css";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Box, Group, Skeleton, Stack } from "@mantine/core";
import { AppShellFrame } from "@/components/app-shell-frame";
import { AppMantineProvider } from "@/components/mantine-provider";
import { navFor, roleLabel } from "@/lib/app-nav";
import { getCurrentUser } from "@/server/auth/current-user";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppMantineProvider>
      <Suspense fallback={<ShellSkeleton />}>
        <Shell>{children}</Shell>
      </Suspense>
    </AppMantineProvider>
  );
}

// Who is signed in is read per request, so it sits inside Suspense (the app uses cacheComponents).
async function Shell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return (
    <AppShellFrame
      groups={navFor(user.role)}
      user={{ name: user.name, role: roleLabel(user.role) }}
      year={new Date().getUTCFullYear()}
    >
      {children}
    </AppShellFrame>
  );
}

function ShellSkeleton() {
  return (
    <Box aria-busy="true" aria-label="Loading">
      <Group h={56} px="md" justify="space-between" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
        <Skeleton h={20} w={110} />
        <Skeleton h={28} w={28} circle />
      </Group>
      <Group align="flex-start" gap={0} wrap="nowrap">
        <Stack gap="sm" p="sm" w={248} visibleFrom="sm">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} h={34} />
          ))}
        </Stack>
        <Stack gap="md" p="lg" flex={1}>
          <Skeleton h={32} w={220} />
          <Skeleton h={120} />
        </Stack>
      </Group>
    </Box>
  );
}
