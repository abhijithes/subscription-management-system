import { clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { RuleError, type ActionResult } from "@/lib/errors";
import { fieldErrorsOf, staffSchema, type StaffInput } from "@/lib/validation/staff";
import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth/require-role";

/** ADMIN only: creates the Clerk login, then our STAFF row. */
export async function createStaff(input: StaffInput): Promise<ActionResult<{ userId: string }>> {
  try {
    await requireRole("ADMIN");
  } catch (error) {
    if (error instanceof RuleError) return { ok: false, message: "Only admins can add staff" };
    throw error;
  }

  const parsed = staffSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsOf(parsed.error), message: "Fix the highlighted fields" };
  }
  const { email, name, password } = parsed.data;

  if (await prisma.user.findUnique({ where: { email } })) {
    return { ok: false, fieldErrors: { email: "That email already has an account" }, message: "Email already in use" };
  }

  const clerk = await clerkClient();
  let clerkUserId: string;
  try {
    const created = await clerk.users.createUser({ emailAddress: [email], password, firstName: name });
    clerkUserId = created.id;
  } catch (error) {
    if (!isClerkAPIResponseError(error)) throw error;
    const first = error.errors[0];
    const field = first?.meta?.paramName === "password" ? "password" : "email";
    const message = first?.longMessage ?? first?.message ?? "Could not create the account";
    return { ok: false, fieldErrors: { [field]: message }, message };
  }

  try {
    const user = await prisma.user.create({
      data: { clerkUserId, email, name, role: "STAFF" },
    });
    return { ok: true, data: { userId: user.id } };
  } catch (error) {
    await clerk.users.deleteUser(clerkUserId); // no login without a row
    throw error;
  }
}

export async function listStaff() {
  await requireRole("ADMIN");
  return prisma.user.findMany({
    where: { role: { in: ["ADMIN", "STAFF"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
}
