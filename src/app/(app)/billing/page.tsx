import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { RuleError } from "@/lib/errors";
import { getDueCount } from "@/server/services/billing";
import { BillingRunner } from "./billing-runner";

export default function BillingPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Billing run</h1>
      <Suspense fallback={<p className="text-sm text-zinc-400">Loading...</p>}>
        <BillingContent />
      </Suspense>
    </main>
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
