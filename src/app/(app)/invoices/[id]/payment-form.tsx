"use client";

import { useActionState } from "react";
import { Button, Group, NativeSelect, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { PAYMENT_METHODS, paymentSchema } from "@/lib/validation/payment";
import { useLiveValidation } from "@/lib/validation/use-live-validation";
import { recordPaymentAction } from "./actions";

export function PaymentForm({ invoiceId, total }: { invoiceId: string; total: string }) {
  const [result, action, pending] = useActionState(recordPaymentAction.bind(null, invoiceId), null);
  const { formProps, errorsWith } = useLiveValidation(paymentSchema);
  const errors = errorsWith(result && !result.ok ? result.fieldErrors : undefined);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Paper withBorder p="md">
      <form action={action} {...formProps}>
        <Stack gap="sm">
          <Title order={2} fz="h4">Record payment</Title>
          <Group align="flex-start" grow>
            <NativeSelect
              name="method"
              label="Method"
              defaultValue="BANK_TRANSFER"
              data={PAYMENT_METHODS.map((m) => ({ value: m, label: m.replace(/_/g, " ").toLowerCase() }))}
              error={errors.method}
            />
            <TextInput name="amount" label="Amount" inputMode="decimal" defaultValue={total} error={errors.amount} />
            <TextInput name="paidAt" label="Paid on" type="date" defaultValue={today} error={errors.paidAt} />
          </Group>
          <TextInput name="note" label="Note (optional)" error={errors.note} />
          <Group>
            <Button type="submit" loading={pending}>Record payment</Button>
          </Group>
          {result && !result.ok && !result.fieldErrors && <Text size="sm" c="red" role="alert">{result.message}</Text>}
        </Stack>
      </form>
    </Paper>
  );
}
