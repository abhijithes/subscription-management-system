import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessDenied } from "@/components/access-denied";
import { RuleError } from "@/lib/errors";
import { getProduct } from "@/server/services/catalog";
import { VariantForm } from "./variant-form";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <Suspense fallback={<p className="text-sm text-zinc-400">Loading product...</p>}>
        <ProductDetail params={params} />
      </Suspense>
      <Link href="/products" className="block text-sm text-zinc-400 underline">Back to products</Link>
    </main>
  );
}

async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let product;
  try {
    product = await getProduct(id);
  } catch (error) {
    if (error instanceof RuleError) return <AccessDenied />;
    throw error;
  }
  if (!product) notFound();

  return (
    <>
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        <p className="text-sm text-zinc-400">
          {product.type} · sales {product.salesPrice} · cost {product.costPrice}
        </p>
        {product.notes && <p className="text-sm">{product.notes}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Variants</h2>
        {product.variants.length === 0 ? (
          <p className="text-sm text-zinc-400">No variants yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 rounded-md border border-zinc-800">
            {product.variants.map((v) => (
              <li key={v.id} className="flex justify-between gap-4 px-4 py-2 text-sm">
                <span>{v.attribute}: {v.value}</span>
                <span className="text-zinc-400">+{v.extraPrice}</span>
              </li>
            ))}
          </ul>
        )}
        <VariantForm productId={product.id} />
      </section>
    </>
  );
}
