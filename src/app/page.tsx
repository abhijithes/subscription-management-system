import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { homePathFor } from "@/server/auth/require-role";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? homePathFor(user.role) : "/sign-in");
}
