import { Suspense } from "react";
import Link from "next/link";
import { AccessDenied } from "@/components/access-denied";
import { RuleError } from "@/lib/errors";
import { listProductOptions } from "@/server/services/catalog";
import { DiscountForm } from "./discount-form";

export default function NewDiscountPage() {
  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">New discount</h1>
      <Suspense fallback={<p className="text-sm text-zinc-400">Loading...</p>}>
        <FormWithProducts />
      </Suspense>
      <Link href="/discounts" className="block text-sm text-zinc-400 underline">Back to discounts</Link>
    </main>
  );
}

async function FormWithProducts() {
  let products;
  try {
    products = await listProductOptions();
  } catch (error) {
    if (error instanceof RuleError) return <AccessDenied />;
    throw error;
  }
  return <DiscountForm products={products} />;
}
