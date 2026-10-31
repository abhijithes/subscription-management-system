"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded border border-neutral-400 px-3 py-1 text-sm print:hidden">
      Print or save as PDF
    </button>
  );
}
