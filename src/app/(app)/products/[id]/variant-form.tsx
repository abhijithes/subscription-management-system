"use client";

import { useActionState } from "react";
import { useLiveValidation } from "@/lib/validation/use-live-validation";
import { variantSchema } from "@/lib/validation/catalog";
import { addVariantAction } from "../actions";

const inputClass = "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm";
const fields = [
  { name: "attribute", placeholder: "Attribute (for example Brand)" },
  { name: "value", placeholder: "Value (for example Odoo)" },
  { name: "extraPrice", placeholder: "Extra price (for example 560)" },
] as const;

export function VariantForm({ productId }: { productId: string }) {
  const [result, action, pending] = useActionState(addVariantAction.bind(null, productId), null);
  const { formProps, errorsWith } = useLiveValidation(variantSchema);
  const errors = errorsWith(result && !result.ok ? result.fieldErrors : undefined);

  return (
    <form action={action} {...formProps} className="max-w-sm space-y-3">
      {fields.map((f) => (
        <div key={f.name}>
          <input name={f.name} placeholder={f.placeholder} inputMode={f.name === "extraPrice" ? "decimal" : undefined} className={inputClass} />
          {errors[f.name] && <p className="mt-1 text-sm text-red-400">{errors[f.name]}</p>}
        </div>
      ))}
      <button disabled={pending} className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50">
        {pending ? "Adding..." : "Add variant"}
      </button>
      {result && !result.ok && !result.fieldErrors && <p className="text-sm text-red-400">{result.message}</p>}
    </form>
  );
}
