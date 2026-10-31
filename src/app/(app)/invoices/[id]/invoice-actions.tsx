"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Group, Stack, Text } from "@mantine/core";
import { invoiceAction } from "./actions";

export function InvoiceActions({ id, canConfirm, canSend }: { id: string; canConfirm: boolean; canSend: boolean }) {
  const [result, action, pending] = useActionState(invoiceAction.bind(null, id), null);

  return (
    <form action={action}>
      <Stack gap="xs">
        <Group gap="sm">
          {canConfirm && (
            <Button type="submit" name="intent" value="confirm" loading={pending}>
              Confirm invoice
            </Button>
          )}
          {canSend && (
            <Button type="submit" name="intent" value="send" variant="default" loading={pending}>
              Send to customer
            </Button>
          )}
          <Button component={Link} href={`/invoices/${id}/print`} target="_blank" variant="default">
            Print view
          </Button>
        </Group>
        {result?.ok && typeof result.data === "object" && result.data !== null && "to" in result.data && (
          <Text size="sm" c="green" role="status">
            {"via" in result.data && result.data.via === "console"
              ? `No email key is set, so the message for ${String(result.data.to)} was printed to the server console.`
              : `Sent to ${String(result.data.to)}.`}
          </Text>
        )}
        {result && !result.ok && <Text size="sm" c="red" role="alert">{result.message}</Text>}
      </Stack>
    </form>
  );
}
