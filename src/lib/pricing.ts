import type { DiscountTarget, DiscountType } from "@/generated/prisma/enums";
import { maxMoney, minMoney, round2, sumMoney, toMoney, type Money } from "./money";

export type LineInput = {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: Money;
  taxName: string | null;
  taxRatePercent: Money;
};

export type AppliedDiscount = {
  ruleId: string;
  type: DiscountType;
  value: Money;
  appliesTo: DiscountTarget;
  productId: string | null;
};

export type PricedLine = LineInput & { discount: Money; net: Money; tax: Money; amount: Money };

export type PricedInvoice = {
  lines: PricedLine[];
  subtotal: Money;
  discountTotal: Money;
  taxTotal: Money;
  total: Money;
};

/** Product sales price plus the chosen variant's extra price (PRD-03). */
export function linePrice(salesPrice: Money, variantExtra: Money | null): Money {
  return round2(salesPrice.plus(variantExtra ?? 0));
}

export function lineGross(line: LineInput): Money {
  return round2(line.unitPrice.times(line.quantity));
}

/**
 * Prices an invoice: discount first, then tax on the post-discount amount. Everything is
 * rounded per line and the invoice totals are sums of the lines (BR-06).
 */
export function priceInvoice(lines: LineInput[], discount: AppliedDiscount | null): PricedInvoice {
  const gross = lines.map(lineGross);
  const applies = lines.map(
    (l) =>
      discount !== null &&
      (discount.appliesTo === "SUBSCRIPTION" || l.productId === discount.productId),
  );
  const base = sumMoney(gross.filter((_, i) => applies[i]));

  const lineDiscounts = lines.map(() => toMoney(0));
  if (discount !== null && base.gt(0)) {
    const wanted =
      discount.type === "FIXED" ? discount.value : round2(base.times(discount.value).div(100));
    const saving = minMoney(wanted, base);
    const last = applies.lastIndexOf(true);
    let allocated = toMoney(0);
    applies.forEach((isTarget, i) => {
      if (!isTarget) return;
      const share =
        i === last ? saving.minus(allocated) : round2(saving.times(gross[i]).div(base));
      lineDiscounts[i] = minMoney(maxMoney(share, toMoney(0)), gross[i]);
      allocated = allocated.plus(lineDiscounts[i]);
    });
  }

  const priced = lines.map<PricedLine>((l, i) => {
    const net = gross[i].minus(lineDiscounts[i]);
    const tax = round2(net.times(l.taxRatePercent).div(100));
    return { ...l, discount: lineDiscounts[i], net, tax, amount: net.plus(tax) };
  });

  return {
    lines: priced,
    subtotal: sumMoney(gross),
    discountTotal: sumMoney(priced.map((l) => l.discount)),
    taxTotal: sumMoney(priced.map((l) => l.tax)),
    total: sumMoney(priced.map((l) => l.amount)),
  };
}
