import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { RuleError } from "@/lib/errors";
import { listTaxes } from "@/server/services/catalog";
import { TaxForm } from "./tax-form";

export default function TaxesPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Taxes</h1>
      <Suspense fallback={<p className="text-sm text-zinc-400">Loading taxes...</p>}>
        <TaxContent />
      </Suspense>
    </main>
  );
}

async function TaxContent() {
  let taxes;
  try {
    taxes = await listTaxes();
  } catch (error) {
    if (error instanceof RuleError) return <AccessDenied />;
    throw error;
  }

  return (
    <>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Add tax</h2>
        <TaxForm />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Current taxes</h2>
        {taxes.length === 0 ? (
          <p className="text-sm text-zinc-400">No taxes yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 rounded-md border border-zinc-800">
            {taxes.map((t) => (
              <li key={t.id} className="flex justify-between gap-4 px-4 py-2 text-sm">
                <span>{t.name}</span>
                <span className="text-zinc-400">{t.ratePercent}%</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
