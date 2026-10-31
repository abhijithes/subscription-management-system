import { notFound, redirect } from "next/navigation";
import { RuleError } from "@/lib/errors";

export const STATUS_COLOUR = { DRAFT: "gray", CONFIRMED: "indigo", PAID: "green" } as const;
export const numeric = { fontVariantNumeric: "tabular-nums" } as const;
export const amount = (value: string) =>
  Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Staff and admins have no portal: they go to their dashboard. Anything not theirs is a 404. */
export function leavePortal(error: unknown): never {
  if (error instanceof RuleError) {
    if (error.code === "NOT_FOUND") notFound();
    if (error.code === "FORBIDDEN") redirect("/dashboard");
  }
  throw error;
}
