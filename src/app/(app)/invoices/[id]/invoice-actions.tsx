"use client";

import { useActionState } from "react";
import Link from "next/link";
import { invoiceAction } from "./actions";

const button = "rounded-md border border-zinc-700 px-4 py-2 text-sm disabled:opacity-50";

export function InvoiceActions({ id, canConfirm, canSend }: { id: string; canConfirm: boolean; canSend: boolean }) {
  const [result, action, pending] = useActionState(invoiceAction.bind(null, id), null);

  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {canConfirm && (
          <button name="intent" value="confirm" disabled={pending} className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50">
            Confirm invoice
          </button>
        )}
        {canSend && <button name="intent" value="send" disabled={pending} className={button}>Send to customer</button>}
        <Link href={`/invoices/${id}/print`} target="_blank" className={button}>Print view</Link>
      </div>
      {result?.ok && typeof result.data === "object" && result.data !== null && "to" in result.data && (
        <p className="text-sm text-green-400">
          {"via" in result.data && result.data.via === "console"
            ? `No email key is set, so the message for ${String(result.data.to)} was printed to the server console.`
            : `Sent to ${String(result.data.to)}.`}
        </p>
      )}
      {result && !result.ok && <p className="text-sm text-red-400">{result.message}</p>}
    </form>
  );
}
