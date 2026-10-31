import { redirect } from "next/navigation";
import type { User } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { RuleError } from "@/lib/errors";
import { getCurrentUser } from "./current-user";

/** Signed-out users go to sign-in; a signed-in user with the wrong role gets FORBIDDEN. */
export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!roles.includes(user.role)) throw new RuleError("FORBIDDEN", "You do not have access");
  return user;
}

export function homePathFor(role: Role): string {
  return role === "CUSTOMER" ? "/portal" : "/dashboard";
}
