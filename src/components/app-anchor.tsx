"use client";

import Link from "next/link";
import { Anchor, type AnchorProps } from "@mantine/core";

/**
 * A Mantine-styled link to another page. Server components cannot hand `Link` to `Anchor` as a prop,
 * so this client component does it with plain props only.
 */
export function AppAnchor({ href, children, ...props }: AnchorProps & { href: string; children: React.ReactNode }) {
  return (
    <Anchor component={Link} href={href} {...props}>
      {children}
    </Anchor>
  );
}
