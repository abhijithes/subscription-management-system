import { Suspense } from "react";
import Link from "next/link";
import { AccessDenied } from "@/components/access-denied";
import { RuleError } from "@/lib/errors";
import { getTemplateFormOptions } from "@/server/services/subscriptions";
import { TemplateForm } from "./template-form";

export default function NewTemplatePage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">New quotation template</h1>
      <Suspense fallback={<p className="text-sm text-zinc-400">Loading...</p>}>
        <FormWithOptions />
      </Suspense>
      <Link href="/templates" className="block text-sm text-zinc-400 underline">Back to templates</Link>
    </main>
  );
}

async function FormWithOptions() {
  let options;
  try {
    options = await getTemplateFormOptions();
  } catch (error) {
    if (error instanceof RuleError) return <AccessDenied />;
    throw error;
  }
  if (options.plans.length === 0 || options.products.length === 0) {
    return <p className="text-sm text-zinc-400">Create at least one plan and one product first.</p>;
  }
  return <TemplateForm plans={options.plans} products={options.products} />;
}
