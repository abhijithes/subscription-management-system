/** Holds the place of Clerk's form while it loads, so the page does not jump. */
export function AuthSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading the form"
      className="h-[28rem] w-[25rem] max-w-[90vw] animate-pulse rounded-xl bg-neutral-500/20"
    />
  );
}
