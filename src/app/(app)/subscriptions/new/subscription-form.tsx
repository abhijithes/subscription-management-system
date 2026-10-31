"use client";

import { useActionState, useMemo, useState } from "react";
import {
  emptyLine,
  LinesEditor,
  type LineValue,
  type ProductOption,
  type TaxOption,
} from "@/components/lines-editor";
import { fromTemplateSchema, subscriptionSchemaFor } from "@/lib/validation/subscription";
import { useLiveValidation } from "@/lib/validation/use-live-validation";
import { createSubscriptionAction } from "../actions";

type Props = {
  customers: { id: string; name: string; email: string }[];
  templates: { id: string; name: string }[];
  plans: { id: string; name: string; minQuantity: number; billingPeriod: string }[];
  products: ProductOption[];
  taxes: TaxOption[];
};

const inputClass = "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm";

function linesOf(data: FormData): unknown {
  try {
    return JSON.parse(String(data.get("lines") ?? "[]"));
  } catch {
    return [];
  }
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-zinc-400" htmlFor={id}>{label}</label>
      {children}
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}

export function SubscriptionForm({ customers, templates, plans, products, taxes }: Props) {
  const [result, action, pending] = useActionState(createSubscriptionAction, null);
  const [mode, setMode] = useState<"template" | "scratch">(templates.length > 0 ? "template" : "scratch");
  const [lines, setLines] = useState<LineValue[]>([emptyLine()]);
  const scratchSchema = useMemo(() => subscriptionSchemaFor(plans), [plans]);
  const { formProps, errorsWith } = useLiveValidation(mode === "template" ? fromTemplateSchema : scratchSchema, {
    values: (data) => ({ ...Object.fromEntries(data), lines: linesOf(data) }),
  });
  const errors = errorsWith(result && !result.ok ? result.fieldErrors : undefined);

  return (
    <form action={action} {...formProps} className="space-y-4">
      <fieldset className="flex gap-6 text-sm">
        <legend className="mb-1 text-zinc-400">Start from</legend>
        {(["template", "scratch"] as const).map((value) => (
          <label key={value} className="flex items-center gap-2">
            <input
              type="radio"
              name="mode"
              value={value}
              checked={mode === value}
              disabled={value === "template" && templates.length === 0}
              onChange={() => setMode(value)}
            />
            {value === "template" ? "A quotation template" : "Scratch"}
          </label>
        ))}
      </fieldset>

      <Field id="customerId" label="Customer" error={errors.customerId}>
        <select id="customerId" name="customerId" defaultValue="" className={inputClass}>
          <option value="">Select a customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
          ))}
        </select>
      </Field>

      {mode === "template" ? (
        <Field id="templateId" label="Template" error={errors.templateId}>
          <select id="templateId" name="templateId" defaultValue="" className={inputClass}>
            <option value="">Select a template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Field>
      ) : (
        <>
          <Field id="planId" label="Plan" error={errors.planId}>
            <select id="planId" name="planId" defaultValue="" className={inputClass}>
              <option value="">Select a plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.billingPeriod.toLowerCase()}, min qty {p.minQuantity})
                </option>
              ))}
            </select>
          </Field>
          <fieldset className="space-y-2">
            <legend className="text-sm text-zinc-400">Lines</legend>
            <input type="hidden" name="lines" value={JSON.stringify(lines)} readOnly />
            <LinesEditor lines={lines} onChange={setLines} products={products} taxes={taxes} />
            {errors.lines && <p className="text-sm text-red-400">{errors.lines}</p>}
          </fieldset>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="startDate" label="Start date" error={errors.startDate}>
          <input id="startDate" name="startDate" type="date" className={inputClass} />
        </Field>
        <Field id="expiryDate" label="Expiry date" error={errors.expiryDate}>
          <input id="expiryDate" name="expiryDate" type="date" className={inputClass} />
        </Field>
        <Field id="paymentTermsDays" label="Payment terms (days)" error={errors.paymentTermsDays}>
          <input id="paymentTermsDays" name="paymentTermsDays" inputMode="numeric" defaultValue="30" className={inputClass} />
        </Field>
      </div>

      <button disabled={pending} className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50">
        {pending ? "Creating..." : "Create subscription"}
      </button>
      {result && !result.ok && !result.fieldErrors && <p className="text-sm text-red-400">{result.message}</p>}
    </form>
  );
}
