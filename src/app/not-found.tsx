import Link from "next/link";

// Shown for any address that does not exist, and when a page calls notFound(). Inside the app it
// appears within the sidebar shell. "/" sends each person to where they belong.
export default function NotFound() {
  return (
    <section
      aria-labelledby="not-found-title"
      className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center"
    >
      <p className="text-5xl font-semibold tabular-nums" aria-hidden="true">404</p>
      <h1 id="not-found-title" className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm opacity-70">This page does not exist, or it has moved.</p>
      <Link href="/" className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
        Go to home
      </Link>
    </section>
  );
}
