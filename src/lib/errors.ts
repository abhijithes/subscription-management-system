export type RuleErrorCode = "VALIDATION" | "FORBIDDEN" | "NOT_FOUND" | "ILLEGAL_TRANSITION";

export class RuleError extends Error {
  constructor(
    public readonly code: RuleErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = "RuleError";
  }
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors?: Record<string, string>; message: string };
