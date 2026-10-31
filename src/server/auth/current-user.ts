import { auth, currentUser } from "@clerk/nextjs/server";
import type { User } from "@/generated/prisma/client";
import { prisma } from "@/server/db";

/**
 * The signed-in user's row, created as a CUSTOMER on first sight. Emails are lowercased, so
 * `A@x.com` and `a@x.com` are the same account.
 */
export async function getCurrentUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress.trim().toLowerCase();
  if (!clerkUser || !email) return null;

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || email.split("@")[0];
  const data = { clerkUserId: userId, email, name, role: "CUSTOMER" as const };

  try {
    return await prisma.user.upsert({ where: { email }, create: data, update: {} });
  } catch (error) {
    // Two first requests at once: the other one created the row.
    const raced = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (raced) return raced;
    throw error;
  }
}
