import { Suspense } from "react";
import { Container, Skeleton, Stack, Title } from "@mantine/core";
import { AccessDenied } from "@/components/access-denied";
import { RuleError } from "@/lib/errors";
import { getDueCount } from "@/server/services/billing";
import { BillingRunner } from "./billing-runner";

export default function BillingPage() {
  return (
    <Container size="md" py="lg" w="100%">
      <Stack gap="lg">
        <Title order={1} fz="h2">Billing run</Title>
        <Suspense
          fallback={
            <Stack gap="sm" aria-busy="true" aria-label="Loading">
              <Skeleton h={40} w="55%" />
              <Skeleton h={36} w={140} />
            </Stack>
          }
        >
          <BillingContent />
        </Suspense>
      </Stack>
    </Container>
  );
}

async function BillingContent() {
  let due;
  try {
    due = await getDueCount();
  } catch (error) {
    if (error instanceof RuleError) return <AccessDenied />;
    throw error;
  }
  return <BillingRunner due={due} />;
}
