"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { authClient } from "@/lib/auth-client";

interface Me {
  name: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
}

interface SessionRow {
  id: string;
  createdAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  current: boolean;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Makassar", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const inputClass = "min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-sm text-ink";

function device(ua: string | null): string {
  if (!ua) return "Unknown device";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "Other";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Browser";
  return `${browser} on ${os}`;
}

export function AdminProfile() {
  const params = useSearchParams();
  const router = useRouter();
  const forced = params.get("change") === "1";
  const [me, setMe] = useState<Me | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [name, setName] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const d = await fetch("/api/admin/me", { cache: "no-store" }).then((r) => r.json());
    if (d?.ok) {
      setMe(d.me);
      setName(d.me.name);
      setSessions(d.sessions);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    setBusy(false);
    setMsg((await res.json()).ok ? { ok: true, text: "Name saved." } : { ok: false, text: "Couldn't save." });
    router.refresh();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (next !== again) return setPwMsg({ ok: false, text: "The two new passwords differ." });
    setBusy(true);
    try {
      const { error } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
      if (error) return setPwMsg({ ok: false, text: error.code === "INVALID_PASSWORD" ? "The current password is not correct." : error.message ?? "Couldn't change the password." });
      await fetch("/api/admin/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passwordChanged: true }) });
      setCurrent("");
      setNext("");
      setAgain("");
      setPwMsg({ ok: true, text: "Password changed. Other devices were signed out." });
      await load();
      if (forced) router.replace("/admin");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function revokeOthers() {
    setBusy(true);
    const d = await fetch("/api/admin/me", { method: "DELETE" }).then((r) => r.json());
    setBusy(false);
    setMsg(d.ok ? { ok: true, text: `Signed out ${d.revoked} other session${d.revoked === 1 ? "" : "s"}.` } : { ok: false, text: "Couldn't sign out other sessions." });
    await load();
  }

  if (!me) return <div><div className="h-72 animate-pulse rounded-[14px] bg-sunken" aria-busy="true" /></div>;

  return (
    <div>
      <p className="eyebrow">Werigo admin</p>
      <h1 className="font-display text-3xl text-ink">My profile</h1>
      <p className="mt-1 text-sm text-ink-soft">{me.email} · {me.role === "super_admin" ? "Super admin" : "Admin"}</p>

      {me.mustChangePassword || forced ? (
        <p role="alert" className="mt-4 rounded-[10px] bg-warn-soft px-3 py-2 text-sm text-warn">
          You are using a temporary password. Set your own below before using the dashboard.
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form onSubmit={changePassword} className="rounded-[14px] border border-line bg-card p-5 text-sm">
          <h2 className="flex items-center gap-2 font-display text-lg text-ink"><KeyRound className="h-4 w-4 text-primary" aria-hidden="true" /> Change password</h2>
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="pw-cur" className="mb-1.5 block font-medium text-ink">Current password</label>
              <input id="pw-cur" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="pw-new" className="mb-1.5 block font-medium text-ink">New password</label>
              <input id="pw-new" type="password" autoComplete="new-password" required minLength={10} value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} />
              <p className="mt-1 text-xs text-ink-faint">At least 10 characters.</p>
            </div>
            <div>
              <label htmlFor="pw-again" className="mb-1.5 block font-medium text-ink">Repeat new password</label>
              <input id="pw-again" type="password" autoComplete="new-password" required value={again} onChange={(e) => setAgain(e.target.value)} className={inputClass} />
            </div>
          </div>
          {pwMsg ? <p role={pwMsg.ok ? "status" : "alert"} className={`mt-3 rounded-[10px] px-3 py-2 ${pwMsg.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>{pwMsg.text}</p> : null}
          <Button type="submit" variant="primary" className="mt-4" disabled={busy}>{busy ? "Please wait…" : "Update password"}</Button>
        </form>

        <div className="space-y-6">
          <form onSubmit={saveName} className="rounded-[14px] border border-line bg-card p-5 text-sm">
            <h2 className="font-display text-lg text-ink">Name</h2>
            <input aria-label="Name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} mt-3`} />
            {msg ? <p role={msg.ok ? "status" : "alert"} className={`mt-3 rounded-[10px] px-3 py-2 ${msg.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>{msg.text}</p> : null}
            <Button type="submit" variant="outline" className="mt-3" disabled={busy}>Save</Button>
          </form>

          <section className="rounded-[14px] border border-line bg-card p-5 text-sm">
            <h2 className="flex items-center gap-2 font-display text-lg text-ink"><MonitorSmartphone className="h-4 w-4 text-primary" aria-hidden="true" /> Signed-in devices</h2>
            <ul className="mt-3 divide-y divide-line">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                  <span>
                    <span className="text-ink">{device(s.userAgent)}{s.current ? " (this device)" : ""}</span>
                    <span className="tnum block text-xs text-ink-faint">since {fmt(s.createdAt)}{s.ipAddress ? ` · ${s.ipAddress}` : ""}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Button variant="outline" size="sm" className="mt-3" disabled={busy || sessions.length <= 1} onClick={() => void revokeOthers()}>Sign out other devices</Button>
          </section>
        </div>
      </div>
    </div>
  );
}
