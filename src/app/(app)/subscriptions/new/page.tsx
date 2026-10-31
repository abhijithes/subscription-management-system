import { Suspense } from "react";
import Link from "next/link";
import { AccessDenied } from "@/components/access-denied";
import { RuleError } from "@/lib/errors";
import { getSubscriptionFormOptions } from "@/server/services/subscriptions";
import { SubscriptionForm } from "./subscription-form";

export default function NewSubscriptionPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">New subscription</h1>
      <Suspense fallback={<p className="text-sm text-zinc-400">Loading...</p>}>
        <FormWithOptions />
      </Suspense>
      <Link href="/subscriptions" className="block text-sm text-zinc-400 underline">Back to subscriptions</Link>
    </main>
  );
}

async function FormWithOptions() {
  let options;
  try {
    options = await getSubscriptionFormOptions();
  } catch (error) {
    if (error instanceof RuleError) return <AccessDenied />;
    throw error;
  }
  if (options.customers.length === 0) {
    return <p className="text-sm text-zinc-400">No customers yet. A customer must sign up first.</p>;
  }
  if (options.plans.length === 0 || options.products.length === 0) {
    return <p className="text-sm text-zinc-400">Create at least one plan and one product first.</p>;
  }
  return <SubscriptionForm {...options} />;
}
