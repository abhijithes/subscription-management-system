import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import type { Role, User } from "@/generated/prisma/client";
import { RuleError } from "@/lib/errors";
import { prisma } from "@/server/db";

/**
 * The `User` row for the signed-in Clerk user, or `null` when signed out.
 *
 * The row is created on first visit with the `CUSTOMER` role. The email is
 * lowercased everywhere so `A@x.com` and `a@x.com` resolve to the same row.
 */
export async function getCurrentUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = (
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress
  )?.toLowerCase();

  if (!email) return null;

  const name =
    clerkUser.fullName ??
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ??
    email;

  const byClerkUserId = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (byClerkUserId) return byClerkUserId;

  // The same person may have signed up with a differently-cased email:
  // adopt that row instead of tripping the unique constraint on `email`.
  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { clerkUserId: userId, name },
    });
  }

  return prisma.user.create({
    data: { clerkUserId: userId, email, name, role: "CUSTOMER" },
  });
}

/**
 * Gate for server components, server actions and route handlers.
 *
 * Signed-out visitors are redirected to sign-in; a signed-in user without one
 * of `roles` gets a `FORBIDDEN` `RuleError`. The UI hiding a button is never
 * the security check — this is.
 */
export async function requireRole(roles: Role[]): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (!roles.includes(user.role)) {
    throw new RuleError(
      "FORBIDDEN",
      `This page requires the ${roles.join(" or ")} role.`,
    );
  }

  return user;
}
