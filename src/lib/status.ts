import type { InvoiceStatus, SubscriptionStatus } from "@/generated/prisma/enums";
import { RuleError } from "./errors";

const SUBSCRIPTION_ORDER: SubscriptionStatus[] = ["DRAFT", "QUOTATION", "CONFIRMED", "ACTIVE", "CLOSED"];

/** A subscription only moves to the very next status (BR-04). */
export function canTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  return SUBSCRIPTION_ORDER.indexOf(to) === SUBSCRIPTION_ORDER.indexOf(from) + 1;
}

/** The status after `from` in the lifecycle, or null at the end. */
export function nextStatus(from: SubscriptionStatus): SubscriptionStatus | null {
  return SUBSCRIPTION_ORDER[SUBSCRIPTION_ORDER.indexOf(from) + 1] ?? null;
}

type PlanFlags = { allowPause: boolean; allowEarlyClose: boolean; allowRenew: boolean };

const FLAG_FOR_ACTION = {
  pause: "allowPause",
  close: "allowEarlyClose",
  renew: "allowRenew",
} as const satisfies Record<string, keyof PlanFlags>;

/** The plan's options decide which actions a subscription allows (BR-08). */
export function assertPlanAllows(action: keyof typeof FLAG_FOR_ACTION, plan: PlanFlags): void {
  if (!plan[FLAG_FOR_ACTION[action]]) {
    throw new RuleError("ILLEGAL_TRANSITION", `This plan does not allow ${action}`);
  }
}

export function canRecordPayment(status: InvoiceStatus): boolean {
  return status === "CONFIRMED";
}
