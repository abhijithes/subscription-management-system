import { Suspense } from "react";
import Link from "next/link";
import { AccessDenied } from "@/components/access-denied";
import { Pagination } from "@/components/pagination";
import { SubscriptionStatus } from "@/generated/prisma/enums";
import { RuleError } from "@/lib/errors";
import { listSubscriptions } from "@/server/services/subscriptions";

type Search = Promise<{ page?: string; status?: string; q?: string }>;

const STATUSES = Object.values(SubscriptionStatus);
const inputClass = "rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm";

export default function SubscriptionsPage({ searchParams }: { searchParams: Search }) {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Subscriptions</h1>
        <Link href="/subscriptions/new" className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black">
          New subscription
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-zinc-400">Loading subscriptions...</p>}>
        <SubscriptionList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SubscriptionList({ searchParams }: { searchParams: Search }) {
  const { page, status, q } = await searchParams;
  const statusFilter = STATUSES.find((s) => s === status);

  let data;
  try {
    data = await listSubscriptions({ status: statusFilter, q, page: Number(page ?? 1) });
  } catch (error) {
    if (error instanceof RuleError) return <AccessDenied />;
    throw error;
  }

  const filtered = Boolean(statusFilter || q);
  return (
    <>
      <form method="get" className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q ?? ""} placeholder="Search number, customer or email" className={`${inputClass} w-72`} />
        <select name="status" defaultValue={statusFilter ?? ""} className={inputClass}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <button className="rounded-md border border-zinc-700 px-4 py-2 text-sm">Filter</button>
        {filtered && <Link href="/subscriptions" className="self-center text-sm text-zinc-400 underline">Clear</Link>}
      </form>

      {data.total === 0 ? (
        <p className="text-sm text-zinc-400">
          {filtered ? "No subscriptions match these filters." : "No subscriptions yet. Create the first one."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="px-4 py-2">Number</th>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2">Plan</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Period</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.rows.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 font-mono">
                      <Link href={`/subscriptions/${s.id}`} className="underline">{s.number}</Link>
                    </td>
                    <td className="px-4 py-2">
                      {s.customerName} <span className="text-zinc-400">{s.customerEmail}</span>
                    </td>
                    <td className="px-4 py-2">{s.planName}</td>
                    <td className="px-4 py-2">
                      {s.status.toLowerCase()}
                      {s.isPaused && <span className="ml-2 text-amber-400">paused</span>}
                    </td>
                    <td className="px-4 py-2">{s.startDate} to {s.expiryDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            basePath="/subscriptions"
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            noun="subscriptions"
            query={{ q, status: statusFilter }}
          />
        </>
      )}
    </>
  );
}
