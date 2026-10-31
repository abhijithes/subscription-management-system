import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessDenied } from "@/components/access-denied";
import { RuleError } from "@/lib/errors";
import { getInvoice } from "@/server/services/invoices";
import { InvoiceActions } from "./invoice-actions";

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <Suspense fallback={<p className="text-sm text-zinc-400">Loading invoice...</p>}>
        <InvoiceDetail params={params} />
      </Suspense>
      <Link href="/invoices" className="block text-sm text-zinc-400 underline">Back to invoices</Link>
    </main>
  );
}

async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let invoice;
  try {
    invoice = await getInvoice(id);
  } catch (error) {
    if (error instanceof RuleError) return <AccessDenied />;
    throw error;
  }
  if (!invoice) notFound();

  return (
    <>
      <section className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold">{invoice.number}</h1>
          <span className="rounded border border-zinc-700 px-2 py-0.5 text-sm">{invoice.status.toLowerCase()}</span>
          {invoice.overdue && <span className="rounded bg-red-500/20 px-2 py-0.5 text-sm text-red-400">overdue</span>}
        </div>
        <p className="text-sm text-zinc-400">
          {invoice.customer.name} ({invoice.customer.email}) · subscription{" "}
          <Link href={`/subscriptions/${invoice.subscription.id}`} className="underline">{invoice.subscription.number}</Link>
        </p>
      </section>

      <InvoiceActions id={invoice.id} {...invoice.actions} />

      <dl className="grid gap-4 text-sm sm:grid-cols-4">
        <div><dt className="text-zinc-400">Invoice date</dt><dd>{invoice.invoiceDate}</dd></div>
        <div><dt className="text-zinc-400">Due date</dt><dd>{invoice.dueDate}</dd></div>
        <div><dt className="text-zinc-400">Billing period</dt><dd>{invoice.periodStart} to {invoice.periodEnd}</dd></div>
        <div><dt className="text-zinc-400">Paid so far</dt><dd>{invoice.amountPaid}</dd></div>
      </dl>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Lines</h2>
        <div className="overflow-x-auto rounded-md border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2 text-right">Qty</th>
                <th className="px-4 py-2 text-right">Unit price</th>
                <th className="px-4 py-2">Tax</th>
                <th className="px-4 py-2 text-right">Discount</th>
                <th className="px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {invoice.lines.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2">{l.description}</td>
                  <td className="px-4 py-2 text-right">{l.quantity}</td>
                  <td className="px-4 py-2 text-right">{l.unitPrice}</td>
                  <td className="px-4 py-2 text-zinc-400">{l.tax ?? "none"}</td>
                  <td className="px-4 py-2 text-right">{l.discount}</td>
                  <td className="px-4 py-2 text-right">{l.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="ml-auto grid max-w-xs grid-cols-2 gap-1 text-sm">
          <dt className="text-zinc-400">Subtotal</dt><dd className="text-right">{invoice.subtotal}</dd>
          <dt className="text-zinc-400">Discount{invoice.discountNames.length > 0 && ` (${invoice.discountNames.join(", ")})`}</dt>
          <dd className="text-right">{invoice.discountTotal}</dd>
          <dt className="text-zinc-400">Tax</dt><dd className="text-right">{invoice.taxTotal}</dd>
          <dt className="font-medium">Total</dt><dd className="text-right font-medium">{invoice.total}</dd>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Payments</h2>
        {invoice.payments.length === 0 ? (
          <p className="text-sm text-zinc-400">No payments recorded.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 rounded-md border border-zinc-800 text-sm">
            {invoice.payments.map((p) => (
              <li key={p.id} className="flex justify-between gap-4 px-4 py-2">
                <span>{p.paidAt} · {p.method}{p.note && <span className="text-zinc-400"> · {p.note}</span>}</span>
                <span>{p.amount}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
