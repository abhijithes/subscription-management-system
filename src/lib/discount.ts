import type { DiscountTarget, DiscountType } from "@/generated/prisma/enums";
import { round2, sumMoney, type Money } from "./money";
import { lineGross, type LineInput } from "./pricing";

export type RuleLike = {
  id: string;
  type: DiscountType;
  value: Money;
  minPurchase: Money | null;
  minQuantity: number | null;
  startsAt: Date;
  endsAt: Date;
  usageLimit: number;
  usedCount: number;
  appliesTo: DiscountTarget;
  productId: string | null;
};

export type RankedRule = { rule: RuleLike; saving: Money };

/**
 * Rules that apply to these lines on `invoiceDate` (BR-07), best saving first. Ties go to the
 * earlier endsAt, then the lower id. A PRODUCT rule checks its minimums against the matching
 * lines only; a SUBSCRIPTION rule checks them against all lines. Minimums are pre-tax.
 */
export function rankEligibleRules(
  rules: RuleLike[],
  lines: LineInput[],
  invoiceDate: Date,
): RankedRule[] {
  const ranked: RankedRule[] = [];
  for (const rule of rules) {
    if (invoiceDate < rule.startsAt || invoiceDate > rule.endsAt) continue;
    if (rule.usedCount >= rule.usageLimit) continue;

    const targets =
      rule.appliesTo === "SUBSCRIPTION"
        ? lines
        : lines.filter((l) => l.productId === rule.productId);
    if (targets.length === 0) continue;

    const base = sumMoney(targets.map(lineGross));
    const quantity = targets.reduce((n, l) => n + l.quantity, 0);
    if (rule.minPurchase !== null && base.lt(rule.minPurchase)) continue;
    if (rule.minQuantity !== null && quantity < rule.minQuantity) continue;

    const wanted = rule.type === "FIXED" ? rule.value : round2(base.times(rule.value).div(100));
    ranked.push({ rule, saving: wanted.gt(base) ? base : wanted });
  }
  return ranked.sort(
    (a, b) =>
      b.saving.comparedTo(a.saving) ||
      a.rule.endsAt.getTime() - b.rule.endsAt.getTime() ||
      a.rule.id.localeCompare(b.rule.id),
  );
}
