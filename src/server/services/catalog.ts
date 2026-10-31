import { toMoney } from "@/lib/money";
import type { ActionResult } from "@/lib/errors";
import {
  planSchema,
  productSchema,
  taxSchema,
  variantSchema,
  type PlanInput,
  type ProductInput,
  type TaxInput,
  type VariantInput,
} from "@/lib/validation/catalog";
import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth/require-role";
import { denyUnlessRole, invalid } from "./guard";

export const PAGE_SIZE = 25;

export async function createProduct(input: ProductInput): Promise<ActionResult<{ id: string }>> {
  const denied = await denyUnlessRole("ADMIN");
  if (denied) return denied;

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { salesPrice, costPrice, ...rest } = parsed.data;

  const product = await prisma.product.create({
    data: { ...rest, salesPrice: toMoney(salesPrice), costPrice: toMoney(costPrice) },
  });
  return { ok: true, data: { id: product.id } };
}

export async function addVariant(
  productId: string,
  input: VariantInput,
): Promise<ActionResult<{ id: string }>> {
  const denied = await denyUnlessRole("ADMIN");
  if (denied) return denied;

  const parsed = variantSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  if (!(await prisma.product.findUnique({ where: { id: productId }, select: { id: true } }))) {
    return { ok: false, message: "Product not found" };
  }
  const { extraPrice, ...rest } = parsed.data;
  const variant = await prisma.productVariant.create({
    data: { ...rest, productId, extraPrice: toMoney(extraPrice) },
  });
  return { ok: true, data: { id: variant.id } };
}

export async function listProducts(page: number) {
  await requireRole("ADMIN");
  const current = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { variants: true } } },
    }),
    prisma.product.count(),
  ]);

  return {
    page: current,
    pageSize: PAGE_SIZE,
    total,
    rows: rows.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      salesPrice: p.salesPrice.toFixed(2),
      costPrice: p.costPrice.toFixed(2),
      variantCount: p._count.variants,
    })),
  };
}

/** One product with its variants, or null when it does not exist. */
export async function getProduct(id: string) {
  await requireRole("ADMIN");
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: { orderBy: { attribute: "asc" } } },
  });
  if (!product) return null;
  return {
    id: product.id,
    name: product.name,
    type: product.type,
    notes: product.notes,
    salesPrice: product.salesPrice.toFixed(2),
    costPrice: product.costPrice.toFixed(2),
    variants: product.variants.map((v) => ({
      id: v.id,
      attribute: v.attribute,
      value: v.value,
      extraPrice: v.extraPrice.toFixed(2),
    })),
  };
}

export async function createPlan(input: PlanInput): Promise<ActionResult<{ id: string }>> {
  const denied = await denyUnlessRole("ADMIN");
  if (denied) return denied;

  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const plan = await prisma.plan.create({
    data: { ...parsed.data, price: toMoney(parsed.data.price) },
  });
  return { ok: true, data: { id: plan.id } };
}

export async function createTax(input: TaxInput): Promise<ActionResult<{ id: string }>> {
  const denied = await denyUnlessRole("ADMIN");
  if (denied) return denied;

  const parsed = taxSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const tax = await prisma.tax.create({
    data: { name: parsed.data.name, ratePercent: toMoney(parsed.data.ratePercent) },
  });
  return { ok: true, data: { id: tax.id } };
}

export async function listPlans(page: number) {
  await requireRole("ADMIN");
  const current = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;

  const [rows, total] = await Promise.all([
    prisma.plan.findMany({
      orderBy: { createdAt: "desc" },
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.plan.count(),
  ]);

  return {
    page: current,
    pageSize: PAGE_SIZE,
    total,
    rows: rows.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price.toFixed(2),
      billingPeriod: p.billingPeriod,
      minQuantity: p.minQuantity,
      availableFrom: p.availableFrom.toISOString().slice(0, 10),
      availableTo: p.availableTo.toISOString().slice(0, 10),
      autoClose: p.autoClose,
      allowEarlyClose: p.allowEarlyClose,
      allowPause: p.allowPause,
      allowRenew: p.allowRenew,
    })),
  };
}

export async function listTaxes() {
  await requireRole("ADMIN");
  const taxes = await prisma.tax.findMany({ orderBy: { name: "asc" } });
  return taxes.map((t) => ({ id: t.id, name: t.name, ratePercent: t.ratePercent.toFixed(2) }));
}
