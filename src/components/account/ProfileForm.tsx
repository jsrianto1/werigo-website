"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, MailWarning } from "lucide-react";
import { T } from "@/components/i18n/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { authClient } from "@/lib/auth-client";

const inputClass =
  "min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-[15px] text-ink placeholder:text-ink-faint disabled:opacity-60";

export function ProfileForm({
  user,
}: {
  user: { name: string; email: string; emailVerified: boolean; phone: string | null; nationality: string | null };
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [nationality, setNationality] = useState(user.nationality ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwMessage, setPwMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  const [verifySent, setVerifySent] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const { error: err } = await authClient.updateUser({
      name: name.trim(),
      phone: phone.trim() || null,
      nationality: nationality.trim() || null,
    });
    setBusy(false);
    if (err) {
      setError(err.message ?? "Couldn't save your details.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwBusy(true);
    setPwMessage(null);
    const { error: err } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    });
    setPwBusy(false);
    if (err) {
      setPwMessage({
        ok: false,
        text:
          err.code === "INVALID_PASSWORD"
            ? "Your current password is not correct."
            : err.code === "CREDENTIAL_ACCOUNT_NOT_FOUND"
              ? "This account signs in with Google. Use \"Forgot password\" to set a password first."
              : err.message ?? "Couldn't change the password.",
      });
      return;
    }
    setCurrent("");
    setNext("");
    setPwMessage({ ok: true, text: "Password changed. Other devices were signed out." });
  }

  async function resendVerification() {
    await authClient.sendVerificationEmail({ email: user.email, callbackURL: "/account/profile" });
    setVerifySent(true);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="space-y-4 rounded-[14px] border border-line bg-card p-6">
        <h2 className="font-display text-xl text-ink"><T>{"Your details"}</T></h2>
        <div>
          <label htmlFor="profile-email" className="mb-1.5 block text-sm font-medium text-ink">Email</label>
          <input id="profile-email" type="email" value={user.email} disabled className={inputClass} />
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-soft">
            {user.emailVerified ? (
              <><BadgeCheck className="h-3.5 w-3.5 text-ok" aria-hidden="true" /><T>{"Email confirmed"}</T></>
            ) : verifySent ? (
              <><MailWarning className="h-3.5 w-3.5 text-warn" aria-hidden="true" /><T>{"Confirmation email sent. Check your inbox."}</T></>
            ) : (
              <>
                <MailWarning className="h-3.5 w-3.5 text-warn" aria-hidden="true" />
                <T>{"Email not confirmed yet."}</T>{" "}
                <button type="button" onClick={() => void resendVerification()} className="cursor-pointer font-semibold text-primary hover:text-primary-strong">
                  <T>{"Resend link"}</T>
                </button>
              </>
            )}
          </p>
        </div>
        <div>
          <label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium text-ink"><T>{"Full name"}</T></label>
          <input id="profile-name" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="profile-phone" className="mb-1.5 block text-sm font-medium text-ink"><T>{"WhatsApp number"}</T></label>
          <input id="profile-phone" type="tel" autoComplete="tel" placeholder="+62 812 3456 7890" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="profile-nationality" className="mb-1.5 block text-sm font-medium text-ink"><T>{"Nationality"}</T></label>
          <input id="profile-nationality" type="text" autoComplete="country-name" value={nationality} onChange={(e) => setNationality(e.target.value)} className={inputClass} />
        </div>
        {error ? <p role="alert" className="rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger"><T>{error}</T></p> : null}
        {saved ? <p role="status" className="rounded-[10px] bg-ok-soft px-3 py-2 text-sm text-ok"><T>{"Saved."}</T></p> : null}
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? <T>{"Saving…"}</T> : <T>{"Save changes"}</T>}
        </Button>
      </form>

      <form onSubmit={changePassword} className="space-y-4 rounded-[14px] border border-line bg-card p-6">
        <h2 className="font-display text-xl text-ink"><T>{"Change password"}</T></h2>
        <div>
          <label htmlFor="pw-current" className="mb-1.5 block text-sm font-medium text-ink"><T>{"Current password"}</T></label>
          <input id="pw-current" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="pw-next" className="mb-1.5 block text-sm font-medium text-ink"><T>{"New password"}</T></label>
          <input id="pw-next" type="password" autoComplete="new-password" required minLength={10} value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} />
          <p className="mt-1 text-xs text-ink-faint"><T>{"At least 10 characters."}</T></p>
        </div>
        {pwMessage ? (
          <p role={pwMessage.ok ? "status" : "alert"} className={`rounded-[10px] px-3 py-2 text-sm ${pwMessage.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
            <T>{pwMessage.text}</T>
          </p>
        ) : null}
        <Button type="submit" variant="outline" disabled={pwBusy}>
          {pwBusy ? <T>{"Please wait…"}</T> : <T>{"Update password"}</T>}
        </Button>
      </form>
    </div>
  );
}
