import { Suspense } from "react";
import Link from "next/link";
import { AccessDenied } from "@/components/access-denied";
import { Pagination } from "@/components/pagination";
import { RuleError } from "@/lib/errors";
import { invoiceFilterSchema } from "@/lib/validation/invoice";
import { listCustomerOptions, listInvoices } from "@/server/services/invoices";

type Search = Promise<Record<string, string | string[] | undefined>>;

const inputClass = "rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm";

export default function InvoicesPage({ searchParams }: { searchParams: Search }) {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Invoices</h1>
      <Suspense fallback={<p className="text-sm text-zinc-400">Loading invoices...</p>}>
        <InvoiceList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function InvoiceList({ searchParams }: { searchParams: Search }) {
  const parsed = invoiceFilterSchema.parse(
    Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])),
  );

  let data, customers;
  try {
    [data, customers] = await Promise.all([
      listInvoices({ ...parsed, page: parsed.page ?? 1 }),
      listCustomerOptions(),
    ]);
  } catch (error) {
    if (error instanceof RuleError) return <AccessDenied />;
    throw error;
  }

  const filtered = Boolean(parsed.status || parsed.overdue || parsed.customerId);
  return (
    <>
      <form method="get" className="flex flex-wrap items-center gap-2">
        <select name="status" defaultValue={parsed.status ?? ""} className={inputClass} aria-label="Status">
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PAID">Paid</option>
        </select>
        <select name="customerId" defaultValue={parsed.customerId ?? ""} className={inputClass} aria-label="Customer">
          <option value="">All customers</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="overdue" value="1" defaultChecked={parsed.overdue} /> Overdue only
        </label>
        <button className="rounded-md border border-zinc-700 px-4 py-2 text-sm">Filter</button>
        {filtered && <Link href="/invoices" className="text-sm text-zinc-400 underline">Clear</Link>}
      </form>

      {data.total === 0 ? (
        <p className="text-sm text-zinc-400">
          {filtered ? "No invoices match these filters." : "No invoices yet. Run billing to create them."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="px-4 py-2">Number</th>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Invoice date</th>
                  <th className="px-4 py-2">Due</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.rows.map((i) => (
                  <tr key={i.id}>
                    <td className="px-4 py-2 font-mono">
                      <Link href={`/invoices/${i.id}`} className="underline">{i.number}</Link>
                    </td>
                    <td className="px-4 py-2">{i.customerName}</td>
                    <td className="px-4 py-2">
                      {i.status.toLowerCase()}
                      {i.overdue && <span className="ml-2 text-red-400">overdue</span>}
                    </td>
                    <td className="px-4 py-2">{i.invoiceDate}</td>
                    <td className="px-4 py-2">{i.dueDate}</td>
                    <td className="px-4 py-2 text-right">{i.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            basePath="/invoices"
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            noun="invoices"
            query={{ status: parsed.status, customerId: parsed.customerId, overdue: parsed.overdue ? "1" : undefined }}
          />
        </>
      )}
    </>
  );
}
