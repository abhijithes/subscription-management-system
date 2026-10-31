import { Suspense } from "react";
import Link from "next/link";
import { AccessDenied } from "@/components/access-denied";
import { RuleError } from "@/lib/errors";
import { listProducts } from "@/server/services/catalog";

export default function ProductsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Link href="/products/new" className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black">
          New product
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-zinc-400">Loading products...</p>}>
        <ProductList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ProductList({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  let data;
  try {
    data = await listProducts(Number(page ?? 1));
  } catch (error) {
    if (error instanceof RuleError) return <AccessDenied />;
    throw error;
  }

  if (data.total === 0) {
    return <p className="text-sm text-zinc-400">No products yet. Create the first one.</p>;
  }

  const pages = Math.ceil(data.total / data.pageSize);
  return (
    <>
      <div className="overflow-x-auto rounded-md border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2 text-right">Sales price</th>
              <th className="px-4 py-2 text-right">Cost price</th>
              <th className="px-4 py-2 text-right">Variants</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {data.rows.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2">
                  <Link href={`/products/${p.id}`} className="underline">{p.name}</Link>
                </td>
                <td className="px-4 py-2">{p.type}</td>
                <td className="px-4 py-2 text-right">{p.salesPrice}</td>
                <td className="px-4 py-2 text-right">{p.costPrice}</td>
                <td className="px-4 py-2 text-right">{p.variantCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>Page {data.page} of {pages} ({data.total} products)</span>
        <span className="space-x-4">
          {data.page > 1 && <Link href={`/products?page=${data.page - 1}`} className="underline">Previous</Link>}
          {data.page < pages && <Link href={`/products?page=${data.page + 1}`} className="underline">Next</Link>}
        </span>
      </div>
    </>
  );
}
