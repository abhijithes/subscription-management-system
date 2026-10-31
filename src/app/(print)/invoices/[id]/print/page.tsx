import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AccessDenied } from "@/components/access-denied";
import { RuleError } from "@/lib/errors";
import { getInvoice } from "@/server/services/invoices";
import { PrintButton } from "./print-button";

export default function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-6 text-sm">Loading invoice...</p>}>
      <PrintableInvoice params={params} />
    </Suspense>
  );
}

// Always black on white, whatever the theme, so it prints and saves as PDF cleanly.
async function PrintableInvoice({ params }: { params: Promise<{ id: string }> }) {
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
    <div className="min-h-screen bg-white p-8 text-black print:min-h-0 print:p-0">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Invoice</h1>
            <p className="font-mono text-lg">{invoice.number}</p>
          </div>
          <div className="space-y-2 text-right">
            <p className="text-xl font-semibold">Brightloop</p>
            <PrintButton />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-neutral-500">Bill to</p>
            <p className="font-medium">{invoice.customer.name}</p>
            {invoice.customer.company && <p>{invoice.customer.company}</p>}
            {invoice.customer.address && <p className="whitespace-pre-line">{invoice.customer.address}</p>}
            <p>{invoice.customer.email}</p>
          </div>
          <dl className="space-y-1 text-right">
            <div><dt className="inline text-neutral-500">Invoice date: </dt><dd className="inline">{invoice.invoiceDate}</dd></div>
            <div><dt className="inline text-neutral-500">Due date: </dt><dd className="inline">{invoice.dueDate}</dd></div>
            <div><dt className="inline text-neutral-500">Period: </dt><dd className="inline">{invoice.periodStart} to {invoice.periodEnd}</dd></div>
            <div><dt className="inline text-neutral-500">Status: </dt><dd className="inline capitalize">{invoice.status.toLowerCase()}</dd></div>
          </dl>
        </div>

        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Unit price</th>
              <th className="py-2 text-right">Discount</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((l) => (
              <tr key={l.id} className="border-b border-neutral-300">
                <td className="py-2">{l.description}{l.tax && <span className="text-neutral-500"> · {l.tax}</span>}</td>
                <td className="py-2 text-right">{l.quantity}</td>
                <td className="py-2 text-right">{l.unitPrice}</td>
                <td className="py-2 text-right">{l.discount}</td>
                <td className="py-2 text-right">{l.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto grid max-w-xs grid-cols-2 gap-1 text-sm">
          <dt className="text-neutral-500">Subtotal</dt><dd className="text-right">{invoice.subtotal}</dd>
          <dt className="text-neutral-500">Discount</dt><dd className="text-right">{invoice.discountTotal}</dd>
          <dt className="text-neutral-500">Tax</dt><dd className="text-right">{invoice.taxTotal}</dd>
          <dt className="border-t-2 border-black pt-1 font-bold">Total</dt>
          <dd className="border-t-2 border-black pt-1 text-right font-bold">{invoice.total}</dd>
        </dl>
      </div>
    </div>
  );
}
