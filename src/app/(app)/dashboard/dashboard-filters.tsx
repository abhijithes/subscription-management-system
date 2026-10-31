"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { Button, Group, Select, Text } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";

type Option = { id: string; name: string };
type Props = { from?: string; to?: string; planId?: string; customerId?: string; plans: Option[]; customers: Option[] };
type Values = { from?: string | null; to?: string | null; planId?: string | null; customerId?: string | null };

const DAY = "YYYY-MM-DD";
const preset = (label: string, start: dayjs.Dayjs, end: dayjs.Dayjs) => ({ label, value: [start.format(DAY), end.format(DAY)] as [string, string] });

/** Filters live in the URL, so a filtered dashboard can be bookmarked or shared. Each change applies at once. */
export function DashboardFilters({ from, to, planId, customerId, plans, customers }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [range, setRange] = useState<[string | null, string | null]>([from ?? null, to ?? null]);
  const current: Values = { from, to, planId, customerId };

  function apply(patch: Values) {
    const next = { ...current, ...patch };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) if (value) params.set(key, value);
    const query = params.toString();
    startTransition(() => router.replace(query ? `/dashboard?${query}` : "/dashboard", { scroll: false }));
  }

  const today = dayjs();
  const filtered = Boolean(from || to || planId || customerId);

  return (
    <Group gap="sm" align="flex-end" wrap="wrap" aria-busy={pending}>
      <DatePickerInput
        type="range"
        label="Date range"
        placeholder="All dates"
        clearable
        value={range}
        valueFormat="D MMM YYYY"
        presets={[
          preset("Last 30 days", today.subtract(29, "day"), today),
          preset("This month", today.startOf("month"), today),
          preset("Last month", today.subtract(1, "month").startOf("month"), today.subtract(1, "month").endOf("month")),
          preset("This year", today.startOf("year"), today),
        ]}
        onChange={(value) => {
          const [start, end] = value;
          setRange([start, end]);
          if ((start && end) || (!start && !end)) apply({ from: start, to: end });
        }}
        w={{ base: "100%", sm: 270 }}
      />
      <Select
        label="Plan"
        placeholder="All plans"
        clearable
        searchable
        data={plans.map((p) => ({ value: p.id, label: p.name }))}
        value={planId ?? null}
        onChange={(value) => apply({ planId: value })}
        w={{ base: "100%", sm: 200 }}
      />
      <Select
        label="Customer"
        placeholder="All customers"
        clearable
        searchable
        data={customers.map((c) => ({ value: c.id, label: c.name }))}
        value={customerId ?? null}
        onChange={(value) => apply({ customerId: value })}
        w={{ base: "100%", sm: 220 }}
      />
      {filtered && (
        <Button
          variant="subtle"
          onClick={() => {
            setRange([null, null]);
            startTransition(() => router.replace("/dashboard", { scroll: false }));
          }}
        >
          Clear filters
        </Button>
      )}
      {pending && <Text size="sm" c="dimmed" role="status">Updating...</Text>}
    </Group>
  );
}
