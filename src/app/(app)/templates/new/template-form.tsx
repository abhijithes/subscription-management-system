"use client";

import { useActionState, useMemo, useState } from "react";
import { templateSchemaFor } from "@/lib/validation/subscription";
import { useLiveValidation } from "@/lib/validation/use-live-validation";
import { createTemplateAction } from "../actions";

type Plan = { id: string; name: string; minQuantity: number; billingPeriod: string };
type Product = { id: string; name: string; variants: { id: string; label: string }[] };
type Line = { productId: string; variantId: string; quantity: string };

const inputClass = "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm";
const emptyLine = (): Line => ({ productId: "", variantId: "", quantity: "1" });

function linesOf(data: FormData): unknown {
  try {
    return JSON.parse(String(data.get("lines") ?? "[]"));
  } catch {
    return [];
  }
}

export function TemplateForm({ plans, products }: { plans: Plan[]; products: Product[] }) {
  const [result, action, pending] = useActionState(createTemplateAction, null);
  const schema = useMemo(() => templateSchemaFor(plans), [plans]);
  const { formProps, errorsWith } = useLiveValidation(schema, {
    values: (data) => ({ ...Object.fromEntries(data), lines: linesOf(data) }),
  });
  const errors = errorsWith(result && !result.ok ? result.fieldErrors : undefined);
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  const update = (index: number, patch: Partial<Line>) =>
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  return (
    <form action={action} {...formProps} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm text-zinc-400" htmlFor="name">Name</label>
        <input id="name" name="name" className={inputClass} />
        {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-400" htmlFor="planId">Plan</label>
        <select id="planId" name="planId" defaultValue="" className={inputClass}>
          <option value="">Select a plan</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.billingPeriod.toLowerCase()}, min qty {p.minQuantity})
            </option>
          ))}
        </select>
        {errors.planId && <p className="mt-1 text-sm text-red-400">{errors.planId}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-400" htmlFor="validityDays">Quotation valid for (days)</label>
        <input id="validityDays" name="validityDays" inputMode="numeric" defaultValue="30" className={inputClass} />
        {errors.validityDays && <p className="mt-1 text-sm text-red-400">{errors.validityDays}</p>}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm text-zinc-400">Lines</legend>
        <input type="hidden" name="lines" value={JSON.stringify(lines)} readOnly />
        {lines.map((line, index) => {
          const variants = products.find((p) => p.id === line.productId)?.variants ?? [];
          return (
            <div key={index} className="grid grid-cols-[1fr_1fr_5rem_auto] items-center gap-2">
              <select
                data-field="lines"
                aria-label="Product"
                value={line.productId}
                onChange={(e) => update(index, { productId: e.target.value, variantId: "" })}
                className={inputClass}
              >
                <option value="">Select a product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                data-field="lines"
                aria-label="Variant"
                value={line.variantId}
                disabled={variants.length === 0}
                onChange={(e) => update(index, { variantId: e.target.value })}
                className={inputClass}
              >
                <option value="">{variants.length === 0 ? "No variants" : "No variant"}</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
              <input
                data-field="lines"
                aria-label="Quantity"
                inputMode="numeric"
                value={line.quantity}
                onChange={(e) => update(index, { quantity: e.target.value })}
                className={inputClass}
              />
              <button
                type="button"
                disabled={lines.length === 1}
                onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                className="text-sm text-zinc-400 underline disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          );
        })}
        {errors.lines && <p className="text-sm text-red-400">{errors.lines}</p>}
        <button type="button" onClick={() => setLines((current) => [...current, emptyLine()])} className="text-sm underline">
          Add line
        </button>
      </fieldset>

      <button disabled={pending} className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50">
        {pending ? "Creating..." : "Create template"}
      </button>
      {result && !result.ok && !result.fieldErrors && <p className="text-sm text-red-400">{result.message}</p>}
    </form>
  );
}
