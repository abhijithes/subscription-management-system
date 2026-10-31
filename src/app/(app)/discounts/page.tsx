import { Suspense } from "react";
import Link from "next/link";
import { AccessDenied } from "@/components/access-denied";
import { Pagination } from "@/components/pagination";
import { RuleError } from "@/lib/errors";
import { listDiscountRules } from "@/server/services/catalog";

export default function DiscountsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Discounts</h1>
        <Link href="/discounts/new" className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black">
          New discount
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-zinc-400">Loading discounts...</p>}>
        <DiscountList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function DiscountList({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  let data;
  try {
    data = await listDiscountRules(Number(page ?? 1));
  } catch (error) {
    if (error instanceof RuleError) return <AccessDenied />;
    throw error;
  }

  if (data.total === 0) {
    return <p className="text-sm text-zinc-400">No discounts yet. Create the first one.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Discount</th>
              <th className="px-4 py-2">Applies to</th>
              <th className="px-4 py-2">Minimums</th>
              <th className="px-4 py-2">Valid</th>
              <th className="px-4 py-2 text-right">Used</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {data.rows.map((r) => {
              const minimums = [
                r.minPurchase && `spend ${r.minPurchase}`,
                r.minQuantity && `qty ${r.minQuantity}`,
              ].filter(Boolean);
              return (
                <tr key={r.id}>
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2">{r.type === "PERCENT" ? `${r.value}%` : r.value}</td>
                  <td className="px-4 py-2">
                    {r.appliesTo === "PRODUCT" ? `Product: ${r.productName}` : "Whole subscription"}
                  </td>
                  <td className="px-4 py-2 text-zinc-400">{minimums.join(", ") || "none"}</td>
                  <td className="px-4 py-2">{r.startsAt} to {r.endsAt}</td>
                  <td className="px-4 py-2 text-right">{r.usedCount} / {r.usageLimit}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination basePath="/discounts" page={data.page} pageSize={data.pageSize} total={data.total} noun="discounts" />
    </>
  );
}
