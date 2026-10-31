"use client";

import { useActionState, useState } from "react";
import { fieldErrorsOf, staffSchema } from "@/lib/validation/staff";
import { createStaffAction } from "./actions";

const inputClass = "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm";

export function StaffForm() {
  const [result, action, pending] = useActionState(createStaffAction, null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const errors = { ...(result && !result.ok ? result.fieldErrors : {}), ...clientErrors };

  function check(e: React.FormEvent<HTMLFormElement>) {
    const parsed = staffSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (parsed.success) return setClientErrors({});
    e.preventDefault();
    setClientErrors(fieldErrorsOf(parsed.error));
  }

  return (
    <form action={action} onSubmit={check} className="max-w-sm space-y-3">
      {(["name", "email", "password"] as const).map((field) => (
        <div key={field}>
          <input
            name={field}
            type={field === "password" ? "password" : field === "email" ? "email" : "text"}
            placeholder={field[0].toUpperCase() + field.slice(1)}
            autoComplete="off"
            className={inputClass}
          />
          {errors[field] && <p className="mt-1 text-sm text-red-400">{errors[field]}</p>}
        </div>
      ))}
      <button disabled={pending} className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50">
        {pending ? "Adding..." : "Add staff member"}
      </button>
      {result?.ok && <p className="text-sm text-green-400">Staff member added.</p>}
      {result && !result.ok && !result.fieldErrors && <p className="text-sm text-red-400">{result.message}</p>}
    </form>
  );
}
