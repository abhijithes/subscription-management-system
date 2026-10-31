/** Amounts arrive from the service as exact two-decimal strings; this only adds thousands separators. */
export function formatAmount(amount: string): string {
  return Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const formatCount = (n: number) => n.toLocaleString("en-US");

export const plural = (n: number, one: string, many = `${one}s`) => `${formatCount(n)} ${n === 1 ? one : many}`;
