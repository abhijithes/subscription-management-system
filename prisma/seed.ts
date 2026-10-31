/**
 * Seed data for Brightloop. `pnpm run db:seed` is safe to re-run (it finds or creates by name and
 * email). `pnpm run db:seed:volume` also adds 50 subscriptions, each with one invoice (and a payment if paid), so no table passes 50 rows from
 * a fixed random seed, so timings are comparable run to run. It writes to whatever DATABASE_URL
 * points at, so check that first.
 *
 * Seeded users have placeholder Clerk ids and cannot sign in. Someone who signs up with a seeded
 * email gets that user's role, so set SEED_ADMIN_EMAIL to your own address to become the admin.
 */
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";

config({ path: [".env.local", ".env"] });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const DAY = 86_400_000;
const utcToday = () => new Date(Math.floor(Date.now() / DAY) * DAY);

async function user(email: string, name: string, role: "ADMIN" | "STAFF" | "CUSTOMER", company?: string) {
  return prisma.user.upsert({
    where: { email },
    create: { email, name, role, company, clerkUserId: `seed_${email}` },
    update: {},
  });
}

async function seedCatalog() {
  const today = utcToday();
  const from = new Date(today.getTime() - 365 * DAY);
  const to = new Date(today.getTime() + 5 * 365 * DAY);

  const admin = await user(process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() || "admin@brightloop.test", "Brightloop Admin", "ADMIN");
  await user("staff@brightloop.test", "Brightloop Staff", "STAFF");
  const customers = [
    await user("asha@acme.test", "Asha Menon", "CUSTOMER", "Acme Retail"),
    await user("ravi@northwind.test", "Ravi Nair", "CUSTOMER", "Northwind Traders"),
    await user("meera@globex.test", "Meera Iyer", "CUSTOMER", "Globex"),
  ];

  const taxes = [];
  for (const [name, ratePercent] of [["GST 18%", "18"], ["GST 5%", "5"]] as const) {
    taxes.push((await prisma.tax.findFirst({ where: { name } })) ?? (await prisma.tax.create({ data: { name, ratePercent } })));
  }

  let product = await prisma.product.findFirst({ where: { name: "Brightloop CRM" } });
  product ??= await prisma.product.create({
    data: { name: "Brightloop CRM", type: "Software", salesPrice: "1200", costPrice: "400", notes: "Seed product" },
  });
  let odoo = await prisma.productVariant.findFirst({ where: { productId: product.id, attribute: "Brand", value: "Odoo" } });
  odoo ??= await prisma.productVariant.create({ data: { productId: product.id, attribute: "Brand", value: "Odoo", extraPrice: "560" } });

  const plans = [];
  for (const [name, billingPeriod, price] of [
    ["Daily", "DAILY", "40"],
    ["Weekly", "WEEKLY", "250"],
    ["Monthly", "MONTHLY", "1000"],
    ["Yearly", "YEARLY", "10000"],
  ] as const) {
    plans.push(
      (await prisma.plan.findFirst({ where: { name } })) ??
        (await prisma.plan.create({
          data: { name, billingPeriod, price, availableFrom: from, availableTo: to, autoClose: true, allowEarlyClose: true, allowPause: true, allowRenew: true },
        })),
    );
  }

  if (!(await prisma.discountRule.findFirst({ where: { name: "Welcome 10%" } }))) {
    await prisma.discountRule.create({
      data: { name: "Welcome 10%", type: "PERCENT", value: "10", minQuantity: 1, startsAt: from, endsAt: to, usageLimit: 100, appliesTo: "SUBSCRIPTION" },
    });
  }
  if (!(await prisma.quotationTemplate.findFirst({ where: { name: "Monthly CRM starter" } }))) {
    await prisma.quotationTemplate.create({
      data: {
        name: "Monthly CRM starter",
        planId: plans[2].id,
        validityDays: 30,
        lines: { create: [{ productId: product.id, variantId: odoo.id, quantity: 1 }] },
      },
    });
  }
  return { admin, customers, plans, taxes, product, odoo };
}

/** A small deterministic generator, so the volume data is the same every run. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function seedVolume(base: Awaited<ReturnType<typeof seedCatalog>>, count: number) {
  const rand = mulberry32(20261031);
  const pick = <T>(items: T[]) => items[Math.floor(rand() * items.length)];
  const today = utcToday();

  const existing = await prisma.subscription.count({ where: { number: { gt: "SUB-90000" } } });
  if (existing > 0) {
    console.log(`Volume data already present (${existing} subscriptions); skipping.`);
    return;
  }

  const customerRows = Array.from({ length: 20 }, (_, i) => ({
    email: `volume${i}@customers.test`,
    name: `Volume Customer ${i}`,
    company: `Company ${i}`,
    role: "CUSTOMER" as const,
    clerkUserId: `seed_volume_${i}`,
  }));
  await prisma.user.createMany({ data: customerRows, skipDuplicates: true });
  const customers = await prisma.user.findMany({ where: { email: { endsWith: "@customers.test" } }, select: { id: true } });

  const statuses = ["ACTIVE", "ACTIVE", "ACTIVE", "CONFIRMED", "CLOSED", "QUOTATION"] as const;
  const subs: Prisma.SubscriptionCreateManyInput[] = [];
  const lines: Prisma.SubscriptionLineCreateManyInput[] = [];
  const invoices: Prisma.InvoiceCreateManyInput[] = [];
  const invoiceLines: Prisma.InvoiceLineCreateManyInput[] = [];
  const payments: Prisma.PaymentCreateManyInput[] = [];

  for (let i = 0; i < count; i++) {
    const id = randomUUID();
    const plan = pick(base.plans);
    const customer = pick(customers);
    const startDate = new Date(today.getTime() - Math.floor(rand() * 300) * DAY);
    const quantity = 1 + Math.floor(rand() * 5);
    const unitPrice = 1000 + Math.floor(rand() * 500);
    const status = pick([...statuses]);
    subs.push({
      id,
      number: `SUB-${String(90001 + i).padStart(5, "0")}`,
      customerId: customer.id,
      planId: plan.id,
      status,
      startDate,
      expiryDate: new Date(startDate.getTime() + 365 * DAY),
      paymentTermsDays: 14,
      nextBillingDate: status === "ACTIVE" ? new Date(today.getTime() + Math.floor(rand() * 30) * DAY) : null,
    });
    lines.push({ subscriptionId: id, productId: base.product.id, variantId: base.odoo.id, quantity, unitPrice: String(unitPrice), taxId: base.taxes[0].id });

    const net = quantity * unitPrice;
    const tax = Math.round(net * 18) / 100;
    for (let n = 0; n < 1; n++) {
      const periodStart = new Date(startDate.getTime() + n * 30 * DAY);
      const invoiceDate = new Date(periodStart.getTime() + 30 * DAY);
      const roll = rand();
      const invStatus = roll < 0.55 ? "PAID" : roll < 0.9 ? "CONFIRMED" : "DRAFT";
      const invoiceId = randomUUID();
      invoices.push({
        id: invoiceId,
        number: `INV-${String(90001 + i).padStart(5, "0")}`,
        subscriptionId: id,
        customerId: customer.id,
        periodStart,
        periodEnd: new Date(periodStart.getTime() + 29 * DAY),
        status: invStatus,
        invoiceDate,
        dueDate: new Date(invoiceDate.getTime() + 14 * DAY),
        subtotal: net.toFixed(2),
        discountTotal: "0.00",
        taxTotal: tax.toFixed(2),
        total: (net + tax).toFixed(2),
      });
      invoiceLines.push({
        invoiceId,
        description: "Brightloop CRM (Brand: Odoo)",
        quantity,
        unitPrice: unitPrice.toFixed(2),
        taxName: "GST 18%",
        taxRatePercent: "18",
        amount: (net + tax).toFixed(2),
      });
      if (invStatus === "PAID") {
        payments.push({
          invoiceId,
          method: pick(["BANK_TRANSFER", "CARD", "UPI"]),
          amount: (net + tax).toFixed(2),
          paidAt: new Date(invoiceDate.getTime() + Math.floor(rand() * 10) * DAY),
          recordedById: base.admin.id,
        });
      }
    }
  }

  const chunk = <T>(rows: T[], size = 2000) => Array.from({ length: Math.ceil(rows.length / size) }, (_, k) => rows.slice(k * size, (k + 1) * size));
  for (const part of chunk(subs)) await prisma.subscription.createMany({ data: part });
  for (const part of chunk(lines)) await prisma.subscriptionLine.createMany({ data: part });
  for (const part of chunk(invoices)) await prisma.invoice.createMany({ data: part });
  for (const part of chunk(invoiceLines)) await prisma.invoiceLine.createMany({ data: part });
  for (const part of chunk(payments)) await prisma.payment.createMany({ data: part });
  console.log(`Volume: ${subs.length} subscriptions, ${invoices.length} invoices, ${payments.length} payments.`);
}

async function main() {
  const base = await seedCatalog();
  console.log("Base seed done.");
  if (process.argv.includes("--volume")) await seedVolume(base, 50);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
