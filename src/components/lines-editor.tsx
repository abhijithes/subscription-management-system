"use client";

export type LineValue = { productId: string; variantId: string; quantity: string; taxId?: string };
export type ProductOption = { id: string; name: string; variants: { id: string; label: string }[] };
export type TaxOption = { id: string; name: string; ratePercent: string };

const inputClass = "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm";

export const emptyLine = (): LineValue => ({ productId: "", variantId: "", quantity: "1", taxId: "" });

/** Lines are submitted as one JSON `lines` field; these controls carry `data-field="lines"` so they validate live. */
export function LinesEditor({
  lines,
  onChange,
  products,
  taxes,
}: {
  lines: LineValue[];
  onChange: (lines: LineValue[]) => void;
  products: ProductOption[];
  taxes?: TaxOption[];
}) {
  const update = (index: number, patch: Partial<LineValue>) =>
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const columns = taxes ? "grid-cols-[1fr_1fr_5rem_8rem_auto]" : "grid-cols-[1fr_1fr_5rem_auto]";

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        const variants = products.find((p) => p.id === line.productId)?.variants ?? [];
        return (
          <div key={index} className={`grid ${columns} items-center gap-2`}>
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
            {taxes && (
              <select
                data-field="lines"
                aria-label="Tax"
                value={line.taxId ?? ""}
                onChange={(e) => update(index, { taxId: e.target.value })}
                className={inputClass}
              >
                <option value="">No tax</option>
                {taxes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.ratePercent}%)</option>
                ))}
              </select>
            )}
            <button
              type="button"
              disabled={lines.length === 1}
              onClick={() => onChange(lines.filter((_, i) => i !== index))}
              className="text-sm text-zinc-400 underline disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        );
      })}
      <button type="button" onClick={() => onChange([...lines, emptyLine()])} className="text-sm underline">
        Add line
      </button>
    </div>
  );
}
