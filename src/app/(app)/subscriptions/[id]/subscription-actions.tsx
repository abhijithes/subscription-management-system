"use client";

import { useActionState } from "react";
import { subscriptionAction } from "./actions";

type Props = {
  id: string;
  next: string | null;
  canPause: boolean;
  canResume: boolean;
  canClose: boolean;
  canRenew: boolean;
};

const button = "rounded-md border border-zinc-700 px-4 py-2 text-sm disabled:opacity-50";

export function SubscriptionActions({ id, next, canPause, canResume, canClose, canRenew }: Props) {
  const [result, action, pending] = useActionState(subscriptionAction.bind(null, id), null);
  if (!next && !canPause && !canResume && !canClose && !canRenew) return null;

  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {next && (
          <>
            <input type="hidden" name="to" value={next} />
            <button name="intent" value="advance" disabled={pending} className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50">
              Move to {next.toLowerCase()}
            </button>
          </>
        )}
        {canPause && <button name="intent" value="pause" disabled={pending} className={button}>Pause</button>}
        {canResume && <button name="intent" value="resume" disabled={pending} className={button}>Resume</button>}
        {canRenew && <button name="intent" value="renew" disabled={pending} className={button}>Renew</button>}
        {canClose && (
          <button
            name="intent"
            value="close"
            disabled={pending}
            onClick={(e) => {
              if (!confirm("Close this subscription? This cannot be undone.")) e.preventDefault();
            }}
            className={`${button} text-red-400`}
          >
            Close
          </button>
        )}
      </div>
      {result && !result.ok && <p className="text-sm text-red-400">{result.message}</p>}
    </form>
  );
}
