"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { AppShell, Box, Burger, Divider, Group, NavLink, ScrollArea, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { NavGroup } from "@/lib/app-nav";

type Props = {
  groups: NavGroup[];
  user: { name: string; role: string };
  year: number;
  children: React.ReactNode;
};

/** Header with the brand and account menu, a role-based sidebar that becomes a drawer on phones, and a footer. */
export function AppShellFrame({ groups, user, year, children }: Props) {
  const pathname = usePathname();
  const [opened, { toggle, close }] = useDisclosure(false);

  // The current page is the most specific link that matches: /portal/invoices lights up Invoices,
  // not Subscriptions too, even though /portal is a prefix of it.
  const activeHref = groups
    .flatMap((group) => group.links)
    .filter((link) => pathname === link.href || pathname.startsWith(`${link.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  // A phone's drawer closes once you have gone somewhere.
  useEffect(() => close(), [pathname, close]);

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 248, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding={0}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Open the menu" />
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
              <Title order={4}>Brightloop</Title>
            </Link>
          </Group>
          <Group gap="sm" wrap="nowrap">
            <Text size="sm" c="dimmed" visibleFrom="xs">{user.name}</Text>
            <UserButton />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm" aria-label="Main">
        <ScrollArea>
          <Stack gap="md">
            {groups.map((group) => (
              <Stack key={group.title} gap={2}>
                <Text size="xs" fw={600} c="dimmed" tt="uppercase" px="sm" pb={4}>{group.title}</Text>
                {group.links.map((link) => (
                  <NavLink
                    key={link.href}
                    component={Link}
                    href={link.href}
                    label={link.label}
                    active={link.href === activeHref}
                    aria-current={link.href === activeHref ? "page" : undefined}
                  />
                ))}
              </Stack>
            ))}
          </Stack>
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <Box style={{ flex: 1, minWidth: 0 }}>{children}</Box>
        <Box component="footer" role="contentinfo" px="md" py="md" mt="xl">
          <Divider mb="md" />
          <Group justify="space-between" gap="xs">
            <Text size="xs" c="dimmed">Brightloop · Subscription management · © {year}</Text>
            <Text size="xs" c="dimmed">Signed in as {user.name} ({user.role})</Text>
          </Group>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
