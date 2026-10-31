import type { ActionResult } from "@/lib/errors";
import { templateSchemaFor, type TemplateInput } from "@/lib/validation/subscription";
import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth/require-role";
import { PAGE_SIZE } from "./catalog";
import { denyUnlessRole, invalid } from "./guard";

const linesError = (message: string): ActionResult<never> => ({
  ok: false,
  fieldErrors: { lines: message },
  message,
});

export async function createTemplate(input: TemplateInput): Promise<ActionResult<{ id: string }>> {
  const denied = await denyUnlessRole("ADMIN", "STAFF");
  if (denied) return denied;

  const plan =
    typeof input?.planId === "string" && input.planId.trim()
      ? await prisma.plan.findUnique({
          where: { id: input.planId.trim() },
          select: { id: true, minQuantity: true },
        })
      : null;

  const parsed = templateSchemaFor(plan ? [plan] : []).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!plan) {
    return { ok: false, fieldErrors: { planId: "Pick an existing plan" }, message: "Plan not found" };
  }
  const { name, validityDays, lines } = parsed.data;

  const products = await prisma.product.findMany({
    where: { id: { in: lines.map((l) => l.productId) } },
    select: { id: true, variants: { select: { id: true } } },
  });
  for (const line of lines) {
    const product = products.find((p) => p.id === line.productId);
    if (!product) return linesError("A selected product no longer exists");
    if (line.variantId && !product.variants.some((v) => v.id === line.variantId)) {
      return linesError("A selected variant does not belong to its product");
    }
  }

  const template = await prisma.quotationTemplate.create({
    data: {
      name,
      planId: plan.id,
      validityDays,
      lines: {
        create: lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId ?? null,
          quantity: l.quantity,
        })),
      },
    },
  });
  return { ok: true, data: { id: template.id } };
}

export async function listTemplates(page: number) {
  await requireRole("ADMIN", "STAFF");
  const current = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;

  const [rows, total] = await Promise.all([
    prisma.quotationTemplate.findMany({
      orderBy: { createdAt: "desc" },
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { plan: { select: { name: true, billingPeriod: true } }, _count: { select: { lines: true } } },
    }),
    prisma.quotationTemplate.count(),
  ]);

  return {
    page: current,
    pageSize: PAGE_SIZE,
    total,
    rows: rows.map((t) => ({
      id: t.id,
      name: t.name,
      planName: t.plan.name,
      billingPeriod: t.plan.billingPeriod,
      validityDays: t.validityDays,
      lineCount: t._count.lines,
      createdAt: t.createdAt.toISOString().slice(0, 10),
    })),
  };
}

/** Plans and products (with variants) to pick from when building a template. */
export async function getTemplateFormOptions() {
  await requireRole("ADMIN", "STAFF");
  const [plans, products] = await Promise.all([
    prisma.plan.findMany({
      orderBy: { name: "asc" },
      take: 200,
      select: { id: true, name: true, minQuantity: true, billingPeriod: true },
    }),
    prisma.product.findMany({
      orderBy: { name: "asc" },
      take: 500,
      select: {
        id: true,
        name: true,
        variants: { orderBy: { attribute: "asc" }, select: { id: true, attribute: true, value: true } },
      },
    }),
  ]);
  return {
    plans,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      variants: p.variants.map((v) => ({ id: v.id, label: `${v.attribute}: ${v.value}` })),
    })),
  };
}
