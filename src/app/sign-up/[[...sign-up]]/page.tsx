import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { AuthSkeleton } from "@/components/auth-skeleton";

export default function Page() {
  return (
    <div className="w-full h-screen grid place-items-center">
      {/* Clerk reads the URL on the client, which this app's caching setup needs inside Suspense. */}
      <Suspense fallback={<AuthSkeleton />}>
        <SignUp
          appearance={{
            theme: dark,
          }}
        />
      </Suspense>
    </div>
  );
}
