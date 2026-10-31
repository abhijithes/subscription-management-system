import { Suspense } from "react";
import { RuleError } from "@/lib/errors";
import { listStaff } from "@/server/services/staff";
import { StaffForm } from "./staff-form";

export default function TeamPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <h1 className="text-2xl font-semibold">Team</h1>
      <Suspense fallback={<p className="text-sm text-zinc-400">Loading...</p>}>
        <TeamContent />
      </Suspense>
    </main>
  );
}

// The role check and database read happen at request time, so they sit inside Suspense.
async function TeamContent() {
  let team;
  try {
    team = await listStaff();
  } catch (error) {
    if (error instanceof RuleError) {
      return <p className="text-sm text-red-400">You do not have access to this page.</p>;
    }
    throw error;
  }

  return (
    <>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Add staff</h2>
        <StaffForm />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Current team</h2>
        <ul className="divide-y divide-zinc-800 rounded-md border border-zinc-800">
          {team.map((member) => (
            <li key={member.id} className="flex justify-between gap-4 px-4 py-2 text-sm">
              <span>
                {member.name} <span className="text-zinc-400">{member.email}</span>
              </span>
              <span className="text-zinc-400">{member.role}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
