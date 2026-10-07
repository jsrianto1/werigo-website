"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { authClient } from "@/lib/auth-client";

/**
 * Admin sign-in. Registration is disabled — staff accounts are created
 * with `node scripts/create-admin.mjs` (see README). A valid session
 * alone is not enough: the server also checks that the account holds
 * a staff role.
 */
export function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: authError } = await authClient.signIn.email({ email, password });
    if (authError) {
      setBusy(false);
      setError("Sign-in failed. Check your email and password.");
      return;
    }
    // Server re-checks the session for a staff role.
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-sunken px-4 py-10">
      <Logo className="mb-6" />
      <div className="w-full max-w-sm">
        <div className="rounded-[14px] border border-line bg-card p-6 shadow-sm">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-2xl text-ink">Admin sign-in</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Werigo staff only. Accounts are provisioned by the site owner.
          </p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="admin-email" className="mb-1.5 block text-sm font-medium text-ink">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-[15px] text-ink"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium text-ink">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-[15px] text-ink"
              />
            </div>
            {error ? (
              <p role="alert" className="rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            ) : null}
            <Button type="submit" variant="primary" size="lg" disabled={busy} className="w-full">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
        <Link href="/" className="mt-6 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to werigo.co
        </Link>
      </div>
    </div>
  );
}
