import { Suspense } from "react";
import Link from "next/link";
import { AccessDenied } from "@/components/access-denied";
import { Pagination } from "@/components/pagination";
import { RuleError } from "@/lib/errors";
import { listPlans } from "@/server/services/catalog";

export default function PlansPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Plans</h1>
        <Link href="/plans/new" className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black">
          New plan
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-zinc-400">Loading plans...</p>}>
        <PlanList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function PlanList({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  let data;
  try {
    data = await listPlans(Number(page ?? 1));
  } catch (error) {
    if (error instanceof RuleError) return <AccessDenied />;
    throw error;
  }

  if (data.total === 0) {
    return <p className="text-sm text-zinc-400">No plans yet. Create the first one.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2 text-right">Price</th>
              <th className="px-4 py-2">Billing</th>
              <th className="px-4 py-2 text-right">Min qty</th>
              <th className="px-4 py-2">Available</th>
              <th className="px-4 py-2">Options</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {data.rows.map((p) => {
              const options = [
                p.autoClose && "auto close",
                p.allowEarlyClose && "early close",
                p.allowPause && "pause",
                p.allowRenew && "renew",
              ].filter(Boolean);
              return (
                <tr key={p.id}>
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2 text-right">{p.price}</td>
                  <td className="px-4 py-2">{p.billingPeriod.toLowerCase()}</td>
                  <td className="px-4 py-2 text-right">{p.minQuantity}</td>
                  <td className="px-4 py-2">{p.availableFrom} to {p.availableTo}</td>
                  <td className="px-4 py-2 text-zinc-400">{options.join(", ") || "none"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination basePath="/plans" page={data.page} pageSize={data.pageSize} total={data.total} noun="plans" />
    </>
  );
}
