import type { Prisma } from "@/generated/prisma/client";
import type { SubscriptionStatus } from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/errors";
import { linePrice } from "@/lib/pricing";
import {
  fromTemplateSchema,
  subscriptionSchemaFor,
  templateSchemaFor,
  type FromTemplateInput,
  type SubscriptionInput,
  type TemplateDates,
  type TemplateInput,
} from "@/lib/validation/subscription";
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

type Created = ActionResult<{ id: string; number: string }>;
type NewLine = { productId: string; variantId: string | null; quantity: number; taxId: string | null };
type NewSubscription = {
  customerId: string;
  planId: string;
  startDate: Date;
  expiryDate: Date;
  paymentTermsDays: number;
  quotationExpiresAt: Date | null;
  lines: NewLine[];
};

const fieldError = (field: string, message: string): ActionResult<never> => ({
  ok: false,
  fieldErrors: { [field]: message },
  message,
});

/** Prices every line from the catalog (BR-06), takes the next number and saves the subscription as DRAFT. */
async function saveSubscription(input: NewSubscription): Promise<Created> {
  const customer = await prisma.user.findUnique({ where: { id: input.customerId }, select: { role: true } });
  if (!customer || customer.role !== "CUSTOMER") return fieldError("customerId", "Pick an existing customer");

  const [products, taxes] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: input.lines.map((l) => l.productId) } },
      select: { id: true, salesPrice: true, variants: { select: { id: true, extraPrice: true } } },
    }),
    prisma.tax.findMany({
      where: { id: { in: input.lines.flatMap((l) => (l.taxId ? [l.taxId] : [])) } },
      select: { id: true },
    }),
  ]);

  const lines: Prisma.SubscriptionLineCreateWithoutSubscriptionInput[] = [];
  for (const line of input.lines) {
    const product = products.find((p) => p.id === line.productId);
    if (!product) return linesError("A selected product no longer exists");
    const variant = line.variantId ? product.variants.find((v) => v.id === line.variantId) : undefined;
    if (line.variantId && !variant) return linesError("A selected variant does not belong to its product");
    if (line.taxId && !taxes.some((t) => t.id === line.taxId)) return linesError("A selected tax no longer exists");
    lines.push({
      product: { connect: { id: product.id } },
      ...(variant ? { variant: { connect: { id: variant.id } } } : {}),
      ...(line.taxId ? { tax: { connect: { id: line.taxId } } } : {}),
      quantity: line.quantity,
      unitPrice: linePrice(product.salesPrice, variant?.extraPrice ?? null),
    });
  }

  const created = await prisma.$transaction(async (tx) => {
    // One writer at a time takes the next number, so numbers are unique and sequential.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7001)`;
    const [{ latest }] = await tx.$queryRaw<{ latest: number | null }[]>`
      SELECT MAX(CAST(SUBSTRING("number" FROM 5) AS INTEGER)) AS latest FROM "Subscription"`;
    const number = `SUB-${String((latest ?? 0) + 1).padStart(5, "0")}`;
    return tx.subscription.create({
      data: {
        number,
        customerId: input.customerId,
        planId: input.planId,
        startDate: input.startDate,
        expiryDate: input.expiryDate,
        paymentTermsDays: input.paymentTermsDays,
        quotationExpiresAt: input.quotationExpiresAt,
        lines: { create: lines },
      },
      select: { id: true, number: true },
    });
  });
  return { ok: true, data: created };
}

export async function createSubscription(input: SubscriptionInput): Promise<Created> {
  const denied = await denyUnlessRole("ADMIN", "STAFF");
  if (denied) return denied;

  const plan =
    typeof input?.planId === "string" && input.planId.trim()
      ? await prisma.plan.findUnique({ where: { id: input.planId.trim() }, select: { id: true, minQuantity: true } })
      : null;
  const parsed = subscriptionSchemaFor(plan ? [plan] : []).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!plan) return fieldError("planId", "Pick an existing plan");

  const { lines, ...rest } = parsed.data;
  return saveSubscription({
    ...rest,
    planId: plan.id,
    quotationExpiresAt: null,
    lines: lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId ?? null,
      quantity: l.quantity,
      taxId: l.taxId ?? null,
    })),
  });
}

export async function createSubscriptionFromTemplate(
  templateId: string,
  customerId: string,
  input: TemplateDates,
): Promise<Created> {
  const denied = await denyUnlessRole("ADMIN", "STAFF");
  if (denied) return denied;

  const parsed = fromTemplateSchema.safeParse({ ...input, templateId, customerId } satisfies FromTemplateInput);
  if (!parsed.success) return invalid(parsed.error);
  const { startDate, expiryDate, paymentTermsDays } = parsed.data;

  const template = await prisma.quotationTemplate.findUnique({
    where: { id: parsed.data.templateId },
    include: { plan: { select: { minQuantity: true } }, lines: true },
  });
  if (!template) return fieldError("templateId", "Pick an existing template");
  if (template.lines.some((l) => l.quantity < template.plan.minQuantity)) {
    return fieldError("templateId", `This template has a line below the plan's minimum quantity of ${template.plan.minQuantity}`);
  }

  return saveSubscription({
    customerId: parsed.data.customerId,
    planId: template.planId,
    startDate,
    expiryDate,
    paymentTermsDays,
    quotationExpiresAt: new Date(Date.now() + template.validityDays * 24 * 60 * 60 * 1000),
    lines: template.lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      quantity: l.quantity,
      taxId: null,
    })),
  });
}

export type SubscriptionFilters = { status?: SubscriptionStatus; q?: string; page: number };

export async function listSubscriptions(filters: SubscriptionFilters) {
  await requireRole("ADMIN", "STAFF");
  const current = Number.isFinite(filters.page) ? Math.max(1, Math.floor(filters.page)) : 1;
  const q = filters.q?.trim();

  const where: Prisma.SubscriptionWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { customer: { name: { contains: q, mode: "insensitive" } } },
            { customer: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { customer: { select: { name: true, email: true } }, plan: { select: { name: true } } },
    }),
    prisma.subscription.count({ where }),
  ]);

  return {
    page: current,
    pageSize: PAGE_SIZE,
    total,
    rows: rows.map((s) => ({
      id: s.id,
      number: s.number,
      customerName: s.customer.name,
      customerEmail: s.customer.email,
      planName: s.plan.name,
      status: s.status,
      isPaused: s.isPaused,
      startDate: s.startDate.toISOString().slice(0, 10),
      expiryDate: s.expiryDate.toISOString().slice(0, 10),
    })),
  };
}

/** Everything the new-subscription form picks from. */
export async function getSubscriptionFormOptions() {
  await requireRole("ADMIN", "STAFF");
  const [customers, templates, taxes, planAndProducts] = await Promise.all([
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { name: "asc" },
      take: 500,
      select: { id: true, name: true, email: true },
    }),
    prisma.quotationTemplate.findMany({
      orderBy: { name: "asc" },
      take: 200,
      select: { id: true, name: true, plan: { select: { name: true } } },
    }),
    prisma.tax.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, ratePercent: true } }),
    getTemplateFormOptions(),
  ]);
  return {
    customers,
    templates: templates.map((t) => ({ id: t.id, name: `${t.name} (${t.plan.name})` })),
    taxes: taxes.map((t) => ({ id: t.id, name: t.name, ratePercent: t.ratePercent.toFixed(2) })),
    plans: planAndProducts.plans,
    products: planAndProducts.products,
  };
}
