"use client";

import { useActionState, useState } from "react";
import { BILLING_PERIODS, planSchema } from "@/lib/validation/catalog";
import { fieldErrorsOf } from "@/lib/validation/field-errors";
import { createPlanAction } from "../actions";

const inputClass = "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm";
const options = [
  { name: "autoClose", label: "Close automatically when the subscription expires" },
  { name: "allowEarlyClose", label: "Allow early close" },
  { name: "allowPause", label: "Allow pause" },
  { name: "allowRenew", label: "Allow renew" },
] as const;

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-zinc-400" htmlFor={id}>{label}</label>
      {children}
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}

export function PlanForm() {
  const [result, action, pending] = useActionState(createPlanAction, null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const errors = { ...(result && !result.ok ? result.fieldErrors : {}), ...clientErrors };

  function check(e: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(e.currentTarget);
    const parsed = planSchema.safeParse({
      ...Object.fromEntries(data),
      ...Object.fromEntries(options.map((o) => [o.name, data.get(o.name) === "on"])),
    });
    if (parsed.success) return setClientErrors({});
    e.preventDefault();
    setClientErrors(fieldErrorsOf(parsed.error));
  }

  return (
    <form action={action} onSubmit={check} className="space-y-3">
      <Field id="name" label="Name" error={errors.name}>
        <input id="name" name="name" className={inputClass} />
      </Field>
      <Field id="price" label="Price" error={errors.price}>
        <input id="price" name="price" inputMode="decimal" className={inputClass} />
      </Field>
      <Field id="billingPeriod" label="Billing period" error={errors.billingPeriod}>
        <select id="billingPeriod" name="billingPeriod" defaultValue="MONTHLY" className={inputClass}>
          {BILLING_PERIODS.map((p) => (
            <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
          ))}
        </select>
      </Field>
      <Field id="minQuantity" label="Minimum quantity" error={errors.minQuantity}>
        <input id="minQuantity" name="minQuantity" inputMode="numeric" defaultValue="1" className={inputClass} />
      </Field>
      <Field id="availableFrom" label="Available from" error={errors.availableFrom}>
        <input id="availableFrom" name="availableFrom" type="date" className={inputClass} />
      </Field>
      <Field id="availableTo" label="Available to" error={errors.availableTo}>
        <input id="availableTo" name="availableTo" type="date" className={inputClass} />
      </Field>
      <fieldset className="space-y-2">
        {options.map((o) => (
          <label key={o.name} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name={o.name} /> {o.label}
          </label>
        ))}
      </fieldset>
      <button disabled={pending} className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50">
        {pending ? "Creating..." : "Create plan"}
      </button>
      {result && !result.ok && !result.fieldErrors && <p className="text-sm text-red-400">{result.message}</p>}
    </form>
  );
}
