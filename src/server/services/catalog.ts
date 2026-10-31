import { toMoney } from "@/lib/money";
import type { ActionResult } from "@/lib/errors";
import {
  productSchema,
  variantSchema,
  type ProductInput,
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
