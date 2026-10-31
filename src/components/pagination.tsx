import { Group, Text } from "@mantine/core";
import { AppAnchor } from "@/components/app-anchor";

type Props = {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  noun: string;
  /** Other query parameters (filters, search) to keep on the Previous and Next links. */
  query?: Record<string, string | undefined>;
};

export function Pagination({ basePath, page, pageSize, total, noun, query = {} }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
    params.set("page", String(target));
    return `${basePath}?${params}`;
  };
  return (
    <Group justify="space-between" gap="md" aria-label="Pagination">
      <Text size="sm" c="dimmed">
        Page {page} of {pages} ({total.toLocaleString("en-US")} {noun})
      </Text>
      <Group gap="md">
        {page > 1 && <AppAnchor href={hrefFor(page - 1)} size="sm">Previous</AppAnchor>}
        {page < pages && <AppAnchor href={hrefFor(page + 1)} size="sm">Next</AppAnchor>}
      </Group>
    </Group>
  );
}
