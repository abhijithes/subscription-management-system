import { Suspense } from "react";
import Link from "next/link";
import { AccessDenied } from "@/components/access-denied";
import { Pagination } from "@/components/pagination";
import { RuleError } from "@/lib/errors";
import { listTemplates } from "@/server/services/subscriptions";

export default function TemplatesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quotation templates</h1>
        <Link href="/templates/new" className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black">
          New template
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-zinc-400">Loading templates...</p>}>
        <TemplateList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function TemplateList({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  let data;
  try {
    data = await listTemplates(Number(page ?? 1));
  } catch (error) {
    if (error instanceof RuleError) return <AccessDenied />;
    throw error;
  }

  if (data.total === 0) {
    return <p className="text-sm text-zinc-400">No templates yet. Create the first one.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Plan</th>
              <th className="px-4 py-2 text-right">Valid for</th>
              <th className="px-4 py-2 text-right">Lines</th>
              <th className="px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {data.rows.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2">{t.name}</td>
                <td className="px-4 py-2">{t.planName} ({t.billingPeriod.toLowerCase()})</td>
                <td className="px-4 py-2 text-right">{t.validityDays} days</td>
                <td className="px-4 py-2 text-right">{t.lineCount}</td>
                <td className="px-4 py-2">{t.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination basePath="/templates" page={data.page} pageSize={data.pageSize} total={data.total} noun="templates" />
    </>
  );
}
