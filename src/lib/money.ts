import { Decimal } from "@prisma/client/runtime/client";

export type Money = Decimal;

const ROUND_HALF_UP = 4;

export function toMoney(value: string | number | Decimal): Money {
  return new Decimal(value);
}

export function round2(value: Money): Money {
  return value.toDecimalPlaces(2, ROUND_HALF_UP);
}

export function minMoney(a: Money, b: Money): Money {
  return a.lt(b) ? a : b;
}

export function maxMoney(a: Money, b: Money): Money {
  return a.gt(b) ? a : b;
}

export function sumMoney(values: Money[]): Money {
  return values.reduce<Money>((total, v) => total.plus(v), new Decimal(0));
}
