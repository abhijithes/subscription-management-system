"use client";

import { useActionState } from "react";
import { useLiveValidation } from "@/lib/validation/use-live-validation";
import { productSchema } from "@/lib/validation/catalog";
import { createProductAction } from "../actions";

const inputClass = "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm";
const fields = [
  { name: "name", label: "Name" },
  { name: "type", label: "Type (for example Software or Service)" },
  { name: "salesPrice", label: "Sales price" },
  { name: "costPrice", label: "Cost price" },
] as const;

export function ProductForm() {
  const [result, action, pending] = useActionState(createProductAction, null);
  const { formProps, errorsWith } = useLiveValidation(productSchema);
  const errors = errorsWith(result && !result.ok ? result.fieldErrors : undefined);

  return (
    <form action={action} {...formProps} className="space-y-3">
      {fields.map((f) => (
        <div key={f.name}>
          <label className="mb-1 block text-sm text-zinc-400" htmlFor={f.name}>{f.label}</label>
          <input id={f.name} name={f.name} inputMode={f.name.endsWith("Price") ? "decimal" : undefined} className={inputClass} />
          {errors[f.name] && <p className="mt-1 text-sm text-red-400">{errors[f.name]}</p>}
        </div>
      ))}
      <div>
        <label className="mb-1 block text-sm text-zinc-400" htmlFor="notes">Notes (optional)</label>
        <textarea id="notes" name="notes" rows={3} className={inputClass} />
        {errors.notes && <p className="mt-1 text-sm text-red-400">{errors.notes}</p>}
      </div>
      <button disabled={pending} className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50">
        {pending ? "Creating..." : "Create product"}
      </button>
      {result && !result.ok && !result.fieldErrors && <p className="text-sm text-red-400">{result.message}</p>}
    </form>
  );
}
