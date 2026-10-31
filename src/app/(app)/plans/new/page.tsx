import Link from "next/link";
import { PlanForm } from "./plan-form";

export default function NewPlanPage() {
  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">New plan</h1>
      <PlanForm />
      <Link href="/plans" className="block text-sm text-zinc-400 underline">Back to plans</Link>
    </main>
  );
}
