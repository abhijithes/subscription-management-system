import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Signed-out users can only see these. Roles live in our users table, so the proxy only checks
// that someone is signed in; each role's home page is chosen by `/` and the layouts.
// `/api/billing/run` is public here because it checks its own service-secret header.
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)", "/forgot-password(.*)", "/api/health", "/api/billing/run"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
