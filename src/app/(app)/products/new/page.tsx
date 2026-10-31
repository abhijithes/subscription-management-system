import Link from "next/link";
import { ProductForm } from "./product-form";

export default function NewProductPage() {
  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">New product</h1>
      <ProductForm />
      <Link href="/products" className="block text-sm text-zinc-400 underline">Back to products</Link>
    </main>
  );
}
