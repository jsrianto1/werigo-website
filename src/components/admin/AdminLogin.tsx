"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

/**
 * Admin sign-in. Registration is disabled — accounts are created by
 * the site owner in the Supabase dashboard (see README). A valid
 * session alone is not enough: the server also checks the email
 * against the private ADMIN_EMAILS allowlist.
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
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Admin sign-in is not configured on this deployment.");
      return;
    }
    setBusy(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) {
      setBusy(false);
      setError("Sign-in failed. Check your email and password.");
      return;
    }
    // Server re-checks the session against the ADMIN_EMAILS allowlist.
    router.refresh();
  }

  return (
    <Section>
      <div className="mx-auto max-w-sm">
        <div className="rounded-[14px] border border-line bg-card p-6">
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
      </div>
    </Section>
  );
}
