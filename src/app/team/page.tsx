import { listStaff } from "@/server/services/staff";
import { StaffForm } from "./staff-form";

export default async function TeamPage() {
  const team = await listStaff();

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <h1 className="text-2xl font-semibold">Team</h1>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Add staff</h2>
        <StaffForm />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Current team</h2>
        <ul className="divide-y divide-zinc-800 rounded-md border border-zinc-800">
          {team.map((member) => (
            <li key={member.id} className="flex justify-between gap-4 px-4 py-2 text-sm">
              <span>{member.name} <span className="text-zinc-400">{member.email}</span></span>
              <span className="text-zinc-400">{member.role}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
