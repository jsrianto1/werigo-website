"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { T } from "@/components/i18n/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { authClient } from "@/lib/auth-client";

const inputClass =
  "min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-[15px] text-ink placeholder:text-ink-faint";

/** Step 1: ask for the email. Always answers the same, so emails cannot be enumerated. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await authClient.requestPasswordReset({ email: email.trim(), redirectTo: "/account/reset-password" }).catch(() => null);
    setBusy(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div>
        <h1 className="font-display text-2xl text-ink"><T>{"Check your inbox"}</T></h1>
        <p className="mt-2 text-sm text-ink-soft">
          <T>{"If an account exists for"}</T> <strong className="font-semibold text-ink">{email}</strong>, <T>{"we sent a link to set a new password. It is valid for one hour."}</T>
        </p>
        <Link href="/account/login" className="mt-5 inline-block text-sm font-semibold text-primary hover:text-primary-strong"><T>{"Back to sign in"}</T></Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <h1 className="font-display text-2xl text-ink"><T>{"Forgot your password?"}</T></h1>
      <p className="mt-1 text-sm text-ink-soft"><T>{"Enter your email and we'll send you a link to set a new one."}</T></p>
      <label htmlFor="forgot-email" className="mb-1.5 mt-5 block text-sm font-medium text-ink">Email</label>
      <input id="forgot-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      <Button type="submit" variant="primary" size="lg" disabled={busy} className="mt-4 w-full">
        {busy ? <T>{"Please wait…"}</T> : <T>{"Send reset link"}</T>}
      </Button>
      <p className="mt-5 text-center text-sm text-ink-soft">
        <Link href="/account/login" className="font-semibold text-primary hover:text-primary-strong"><T>{"Back to sign in"}</T></Link>
      </p>
    </form>
  );
}

/** Step 2: the link from the email lands here with ?token=…. */
export function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const invalid = params.get("error") === "INVALID_TOKEN" || !token;
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    const { error: err } = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);
    if (err) {
      setError(err.code === "INVALID_TOKEN" ? "This link is no longer valid. Request a new one." : err.message ?? "Couldn't set the password.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/account/login"), 1500);
  }

  if (invalid) {
    return (
      <div>
        <h1 className="font-display text-2xl text-ink"><T>{"This link is not valid"}</T></h1>
        <p className="mt-2 text-sm text-ink-soft"><T>{"Password reset links work once and expire after one hour."}</T></p>
        <Link href="/account/forgot-password" className="mt-5 inline-block text-sm font-semibold text-primary hover:text-primary-strong"><T>{"Request a new link"}</T></Link>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <h1 className="font-display text-2xl text-ink"><T>{"Password updated"}</T></h1>
        <p className="mt-2 text-sm text-ink-soft"><T>{"You can sign in with your new password now."}</T></p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <h1 className="font-display text-2xl text-ink"><T>{"Set a new password"}</T></h1>
      <label htmlFor="reset-password" className="mb-1.5 mt-5 block text-sm font-medium text-ink"><T>{"New password"}</T></label>
      <input id="reset-password" type="password" autoComplete="new-password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
      <p className="mt-1 text-xs text-ink-faint"><T>{"At least 10 characters."}</T></p>
      {error ? <p role="alert" className="mt-3 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger"><T>{error}</T></p> : null}
      <Button type="submit" variant="primary" size="lg" disabled={busy} className="mt-4 w-full">
        {busy ? <T>{"Please wait…"}</T> : <T>{"Save password"}</T>}
      </Button>
    </form>
  );
}
