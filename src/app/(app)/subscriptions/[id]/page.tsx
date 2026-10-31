import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessDenied } from "@/components/access-denied";
import { RuleError } from "@/lib/errors";
import { getSubscription } from "@/server/services/subscriptions";
import { SubscriptionActions } from "./subscription-actions";

const STEPS = ["DRAFT", "QUOTATION", "CONFIRMED", "ACTIVE", "CLOSED"] as const;

export default function SubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <Suspense fallback={<p className="text-sm text-zinc-400">Loading subscription...</p>}>
        <SubscriptionDetail params={params} />
      </Suspense>
      <Link href="/subscriptions" className="block text-sm text-zinc-400 underline">Back to subscriptions</Link>
    </main>
  );
}

async function SubscriptionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let sub;
  try {
    sub = await getSubscription(id);
  } catch (error) {
    if (error instanceof RuleError) return <AccessDenied />;
    throw error;
  }
  if (!sub) notFound();

  const current = STEPS.indexOf(sub.status);
  return (
    <>
      <section className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold">{sub.number}</h1>
          {sub.isPaused && <span className="rounded bg-amber-500/20 px-2 py-0.5 text-sm text-amber-400">paused</span>}
          {sub.expired && <span className="rounded bg-red-500/20 px-2 py-0.5 text-sm text-red-400">expired</span>}
        </div>
        <p className="text-sm text-zinc-400">
          {sub.customer.name} ({sub.customer.email}) · {sub.plan.name}, {sub.plan.billingPeriod.toLowerCase()}
        </p>
      </section>

      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Status">
        {STEPS.map((step, index) => (
          <li
            key={step}
            aria-current={index === current ? "step" : undefined}
            className={`rounded-full border px-3 py-1 ${
              index === current
                ? "border-white bg-white text-black"
                : index < current
                  ? "border-zinc-600 text-zinc-300"
                  : "border-zinc-800 text-zinc-500"
            }`}
          >
            {step.charAt(0) + step.slice(1).toLowerCase()}
          </li>
        ))}
      </ol>

      <SubscriptionActions id={sub.id} {...sub.actions} />

      <dl className="grid gap-4 text-sm sm:grid-cols-3">
        <div><dt className="text-zinc-400">Start</dt><dd>{sub.startDate}</dd></div>
        <div><dt className="text-zinc-400">Expiry</dt><dd>{sub.expiryDate}</dd></div>
        <div><dt className="text-zinc-400">Payment terms</dt><dd>{sub.paymentTermsDays} days</dd></div>
        <div><dt className="text-zinc-400">Next billing</dt><dd>{sub.nextBillingDate ?? "not scheduled"}</dd></div>
        {sub.quotationExpiresAt && <div><dt className="text-zinc-400">Quotation valid until</dt><dd>{sub.quotationExpiresAt}</dd></div>}
      </dl>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Lines</h2>
        <div className="overflow-x-auto rounded-md border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2 text-right">Qty</th>
                <th className="px-4 py-2 text-right">Unit price</th>
                <th className="px-4 py-2">Tax</th>
                <th className="px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {sub.lines.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2">
                    {l.product}
                    {l.variant && <span className="text-zinc-400"> · {l.variant}</span>}
                  </td>
                  <td className="px-4 py-2 text-right">{l.quantity}</td>
                  <td className="px-4 py-2 text-right">{l.unitPrice}</td>
                  <td className="px-4 py-2 text-zinc-400">{l.tax ?? "none"}</td>
                  <td className="px-4 py-2 text-right">{l.amount}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right text-zinc-400">Subtotal before tax and discounts</td>
                <td className="px-4 py-2 text-right font-medium">{sub.subtotal}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </>
  );
}
