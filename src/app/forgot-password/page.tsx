"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { validatePassword } from "@/lib/password";

type Step = "email" | "code" | "password";

const inputClass = "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white";
const buttonClass =
  "w-full rounded-md bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-50";

export default function ForgotPasswordPage() {
  const { signIn } = useSignIn();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isSignedIn) router.replace("/");
  }, [isSignedIn, router]);

  async function run(action: () => Promise<{ error: { message: string } | null }>, next: () => void) {
    setBusy(true);
    setErrors([]);
    const { error } = await action();
    setBusy(false);
    if (error) setErrors([error.message]);
    else next();
  }

  function sendCode(e: React.FormEvent) {
    e.preventDefault();
    void run(
      async () => {
        const created = await signIn.create({ identifier: email.trim().toLowerCase() });
        if (created.error) return created;
        return signIn.resetPasswordEmailCode.sendCode();
      },
      () => setStep("code"),
    );
  }

  function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    void run(() => signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() }), () => setStep("password"));
  }

  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    const problems = validatePassword(password);
    if (problems.length > 0) return setErrors(problems);
    void run(
      async () => {
        const submitted = await signIn.resetPasswordEmailCode.submitPassword({ password });
        if (submitted.error) return submitted;
        return signIn.finalize({ navigate: () => router.push("/") });
      },
      () => {},
    );
  }

  return (
    <div className="grid h-screen w-full place-items-center bg-black">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <h1 className="text-xl font-semibold text-white">Reset your password</h1>

        {step === "email" && (
          <form onSubmit={sendCode} className="space-y-3">
            <p className="text-sm text-zinc-400">We will email you a code.</p>
            <input className={inputClass} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className={buttonClass} disabled={busy}>Send code</button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={verifyCode} className="space-y-3">
            <p className="text-sm text-zinc-400">Enter the code sent to {email}.</p>
            <input className={inputClass} required inputMode="numeric" placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} />
            <button className={buttonClass} disabled={busy}>Verify code</button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={submitPassword} className="space-y-3">
            <p className="text-sm text-zinc-400">At least 9 characters with upper, lower and a special character.</p>
            <input className={inputClass} type="password" required placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className={buttonClass} disabled={busy}>Set new password</button>
          </form>
        )}

        {errors.length > 0 && (
          <ul className="space-y-1 text-sm text-red-400">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}

        <Link href="/sign-in" className="block text-sm text-zinc-400 underline">Back to sign in</Link>
      </div>
    </div>
  );
}
