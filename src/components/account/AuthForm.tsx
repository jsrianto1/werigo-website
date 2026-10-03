"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T } from "@/components/i18n/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { authClient } from "@/lib/auth-client";

/**
 * Sign-in / create-account form shared by /account/login,
 * /account/register and the inline step in checkout. Email + password,
 * plus Google when the server has credentials for it.
 */
export type AuthMode = "login" | "register";

const inputClass =
  "min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-[15px] text-ink placeholder:text-ink-faint";

const ERRORS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "That email and password don't match.",
  USER_ALREADY_EXISTS: "An account with this email already exists. Sign in instead.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "An account with this email already exists. Sign in instead.",
  PASSWORD_TOO_SHORT: "Use at least 10 characters for your password.",
  PASSWORD_TOO_LONG: "That password is too long.",
  INVALID_EMAIL: "Enter a valid email address.",
  EMAIL_NOT_VERIFIED: "Please confirm your email first. Check your inbox for the link.",
  BANNED_USER: "This account has been suspended. Contact us on WhatsApp.",
  USER_NOT_FOUND: "That email and password don't match.",
};

function describe(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return "Something went wrong. Please try again.";
  return (error.code && ERRORS[error.code]) || error.message || "Something went wrong. Please try again.";
}

export function AuthForm({
  initialMode = "login",
  googleEnabled,
  callbackURL = "/account",
  onSuccess,
  heading = true,
}: {
  initialMode?: AuthMode;
  googleEnabled: boolean;
  /** Where to land after signing in (also used for Google). */
  callbackURL?: string;
  /** Inline use (checkout): called instead of navigating. */
  onSuccess?: () => void;
  heading?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function done() {
    if (onSuccess) {
      onSuccess();
    } else {
      router.push(callbackURL);
    }
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        const { error: err } = await authClient.signIn.email({ email: email.trim(), password });
        if (err) {
          setError(describe(err));
          return;
        }
      } else {
        const { error: err } = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
          callbackURL,
        });
        if (err) {
          setError(describe(err));
          return;
        }
      }
      done();
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    setBusy(true);
    const { error: err } = await authClient.signIn.social({ provider: "google", callbackURL });
    if (err) {
      setError(describe(err));
      setBusy(false);
    }
    // On success the browser is redirected to Google.
  }

  return (
    <div>
      {heading ? (
        <>
          <h1 className="font-display text-2xl text-ink">
            <T>{mode === "login" ? "Sign in" : "Create your account"}</T>
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            <T>
              {mode === "login"
                ? "Track your bookings and pay securely."
                : "One account for your bookings, payments and receipts."}
            </T>
          </p>
        </>
      ) : null}

      {googleEnabled ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={busy}
            onClick={() => void google()}
            className={`w-full ${heading ? "mt-5" : ""}`}
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.3 17.7 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
              <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z" />
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.7-3.8-13.6-9.1l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
            </svg>
            <T>{"Continue with Google"}</T>
          </Button>
          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-ink-faint">
            <span className="h-px flex-1 bg-line" />
            <T>{"or with email"}</T>
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      ) : (
        <div className={heading ? "mt-5" : ""} />
      )}

      <form onSubmit={submit} className="space-y-4">
        {mode === "register" ? (
          <div>
            <label htmlFor="auth-name" className="mb-1.5 block text-sm font-medium text-ink">
              <T>{"Full name"}</T>
            </label>
            <input id="auth-name" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
        ) : null}
        <div>
          <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium text-ink">
            Email
          </label>
          <input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        {mode === "register" ? (
          <div>
            <label htmlFor="auth-phone" className="mb-1.5 block text-sm font-medium text-ink">
              <T>{"WhatsApp number"}</T> <span className="font-normal text-ink-faint"><T>{"(optional)"}</T></span>
            </label>
            <input id="auth-phone" type="tel" autoComplete="tel" placeholder="+62 812 3456 7890" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </div>
        ) : null}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="auth-password" className="block text-sm font-medium text-ink">
              Password
            </label>
            {mode === "login" ? (
              <Link href="/account/forgot-password" className="text-xs font-medium text-primary hover:text-primary-strong">
                <T>{"Forgot password?"}</T>
              </Link>
            ) : null}
          </div>
          <input
            id="auth-password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={mode === "register" ? 10 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          {mode === "register" ? (
            <p className="mt-1 text-xs text-ink-faint"><T>{"At least 10 characters."}</T></p>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">
            <T>{error}</T>
          </p>
        ) : null}
        <Button type="submit" variant="primary" size="lg" disabled={busy} className="w-full">
          {busy ? <T>{"Please wait…"}</T> : <T>{mode === "login" ? "Sign in" : "Create account"}</T>}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-soft">
        {mode === "login" ? (
          <>
            <T>{"New to Werigo?"}</T>{" "}
            <button type="button" onClick={() => { setMode("register"); setError(null); }} className="cursor-pointer font-semibold text-primary hover:text-primary-strong">
              <T>{"Create an account"}</T>
            </button>
          </>
        ) : (
          <>
            <T>{"Already have an account?"}</T>{" "}
            <button type="button" onClick={() => { setMode("login"); setError(null); }} className="cursor-pointer font-semibold text-primary hover:text-primary-strong">
              <T>{"Sign in"}</T>
            </button>
          </>
        )}
      </p>
      {mode === "register" ? (
        <p className="mt-3 text-center text-xs leading-relaxed text-ink-faint">
          <T>{"By creating an account you agree to our"}</T>{" "}
          <Link href="/terms" className="underline underline-offset-2">terms</Link> <T>{"and"}</T>{" "}
          <Link href="/privacy" className="underline underline-offset-2">privacy policy</Link>.
        </p>
      ) : null}
    </div>
  );
}
