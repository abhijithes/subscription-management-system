import type { z } from "zod";
import { RuleError, type ActionResult } from "@/lib/errors";
import type { Role } from "@/generated/prisma/enums";
import { fieldErrorsOf } from "@/lib/validation/field-errors";
import { requireRole } from "@/server/auth/require-role";

/** Returns an `ok: false` result when the caller's role is not allowed, otherwise null. */
export async function denyUnlessRole(...roles: Role[]): Promise<ActionResult<never> | null> {
  try {
    await requireRole(...roles);
    return null;
  } catch (error) {
    if (error instanceof RuleError) return { ok: false, message: "You do not have access" };
    throw error;
  }
}

export function invalid(error: z.ZodError): ActionResult<never> {
  return { ok: false, fieldErrors: fieldErrorsOf(error), message: "Fix the highlighted fields" };
}
