import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { homePathFor } from "@/server/auth/require-role";

// Who is signed in is read per request, so it sits inside Suspense (the app uses cacheComponents).
export default function Home() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-zinc-400" aria-busy="true">Loading...</p>}>
      <SendHome />
    </Suspense>
  );
}

async function SendHome(): Promise<never> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  redirect(homePathFor(user.role));
}
