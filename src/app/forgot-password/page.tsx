import { redirect } from "next/navigation";

// Clerk's <SignIn /> has its own "Forgot password?" flow, so this route only points there.
export default function ForgotPasswordPage() {
  redirect("/sign-in");
}
