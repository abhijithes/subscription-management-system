"use client";

import { useActionState, useState } from "react";
import { discountRuleSchema } from "@/lib/validation/catalog";
import { useLiveValidation } from "@/lib/validation/use-live-validation";
import { createDiscountRuleAction } from "../actions";

const inputClass = "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm";

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-zinc-400" htmlFor={id}>{label}</label>
      {children}
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}

export function DiscountForm({ products }: { products: { id: string; name: string }[] }) {
  const [result, action, pending] = useActionState(createDiscountRuleAction, null);
  const { formProps, errorsWith } = useLiveValidation(discountRuleSchema);
  const errors = errorsWith(result && !result.ok ? result.fieldErrors : undefined);
  const [appliesTo, setAppliesTo] = useState("SUBSCRIPTION");

  return (
    <form action={action} {...formProps} className="space-y-3">
      <Field id="name" label="Name" error={errors.name}>
        <input id="name" name="name" className={inputClass} />
      </Field>
      <Field id="type" label="Type" error={errors.type}>
        <select id="type" name="type" defaultValue="PERCENT" className={inputClass}>
          <option value="PERCENT">Percentage</option>
          <option value="FIXED">Fixed amount</option>
        </select>
      </Field>
      <Field id="value" label="Value (a percentage or an amount)" error={errors.value}>
        <input id="value" name="value" inputMode="decimal" className={inputClass} />
      </Field>
      <Field id="appliesTo" label="Applies to" error={errors.appliesTo}>
        <select id="appliesTo" name="appliesTo" value={appliesTo} onChange={(e) => setAppliesTo(e.target.value)} className={inputClass}>
          <option value="SUBSCRIPTION">Whole subscription</option>
          <option value="PRODUCT">One product</option>
        </select>
      </Field>
      {appliesTo === "PRODUCT" && (
        <Field id="productId" label="Product" error={errors.productId}>
          <select id="productId" name="productId" defaultValue="" className={inputClass}>
            <option value="">Select a product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
      )}
      <Field id="minPurchase" label="Minimum purchase before tax (optional)" error={errors.minPurchase}>
        <input id="minPurchase" name="minPurchase" inputMode="decimal" className={inputClass} />
      </Field>
      <Field id="minQuantity" label="Minimum quantity (optional)" error={errors.minQuantity}>
        <input id="minQuantity" name="minQuantity" inputMode="numeric" className={inputClass} />
      </Field>
      <Field id="startsAt" label="Starts" error={errors.startsAt}>
        <input id="startsAt" name="startsAt" type="date" className={inputClass} />
      </Field>
      <Field id="endsAt" label="Ends" error={errors.endsAt}>
        <input id="endsAt" name="endsAt" type="date" className={inputClass} />
      </Field>
      <Field id="usageLimit" label="Usage limit" error={errors.usageLimit}>
        <input id="usageLimit" name="usageLimit" inputMode="numeric" className={inputClass} />
      </Field>
      <button disabled={pending} className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50">
        {pending ? "Creating..." : "Create discount"}
      </button>
      {result && !result.ok && !result.fieldErrors && <p className="text-sm text-red-400">{result.message}</p>}
    </form>
  );
}
