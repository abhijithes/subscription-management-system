"use client";

import { useActionState } from "react";
import { taxSchema } from "@/lib/validation/catalog";
import { useLiveValidation } from "@/lib/validation/use-live-validation";
import { createTaxAction } from "./actions";

const inputClass = "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm";

export function TaxForm() {
  const [result, action, pending] = useActionState(createTaxAction, null);
  const { formProps, errorsWith } = useLiveValidation(taxSchema);
  const errors = errorsWith(result && !result.ok ? result.fieldErrors : undefined);

  return (
    <form action={action} {...formProps} className="max-w-sm space-y-3">
      <div>
        <input name="name" placeholder="Name (for example GST)" className={inputClass} />
        {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
      </div>
      <div>
        <input name="ratePercent" placeholder="Rate in percent (for example 18)" inputMode="decimal" className={inputClass} />
        {errors.ratePercent && <p className="mt-1 text-sm text-red-400">{errors.ratePercent}</p>}
      </div>
      <button disabled={pending} className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50">
        {pending ? "Adding..." : "Add tax"}
      </button>
      {result?.ok && <p className="text-sm text-green-400">Tax added.</p>}
      {result && !result.ok && !result.fieldErrors && <p className="text-sm text-red-400">{result.message}</p>}
    </form>
  );
}
