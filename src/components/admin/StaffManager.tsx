"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, LogOut, Plus, ShieldCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Staff {
  id: string;
  name: string;
  email: string;
  role: "admin" | "super_admin";
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  sessions: number;
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Makassar", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "never";

const inputClass = (err?: string) =>
  `min-h-11 w-full rounded-[10px] border bg-card px-3 text-sm text-ink placeholder:text-ink-faint ${err ? "border-danger" : "border-line-strong"}`;

function tempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  const arr = new Uint32Array(14);
  crypto.getRandomValues(arr);
  for (const n of arr) out += chars[n % chars.length];
  return out;
}

export function StaffManager() {
  const [rows, setRows] = useState<Staff[] | null>(null);
  const [me, setMe] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "admin" as Staff["role"], tempPassword: tempPassword() });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [handover, setHandover] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/staff", { cache: "no-store" });
      const d = await res.json();
      if (!d.ok) throw new Error();
      setRows(d.staff);
      setMe(d.me);
    } catch {
      setError("Couldn't load staff.");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function patch(s: Staff, body: Record<string, unknown>, success: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/staff/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json();
      if (!d.ok) return setMsg({ ok: false, text: d.message ?? "Couldn't update." });
      setMsg({ ok: true, text: success });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFieldErrors({});
    setMsg(null);
    try {
      const res = await fetch("/api/admin/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!d.ok) return setFieldErrors(d.fieldErrors ?? { form: d.message ?? "Couldn't create the account." });
      setHandover({ email: form.email, password: form.tempPassword });
      setCreating(false);
      setForm({ name: "", email: "", role: "admin", tempPassword: tempPassword() });
      await load();
    } finally {
      setBusy(false);
    }
  }

  function resetPassword(s: Staff) {
    const pw = tempPassword();
    if (!window.confirm(`Set a new temporary password for ${s.email}? They are signed out everywhere and must choose their own password at the next sign-in.`)) return;
    void patch(s, { tempPassword: pw }, "Temporary password set.").then(() => setHandover({ email: s.email, password: pw }));
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Werigo admin</p>
          <h1 className="font-display text-3xl text-ink">Staff</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Admins handle bookings, customers, stock and promotions. Super admins also manage refunds, payouts,
            staff, settings and the audit log. New accounts get a temporary password and must set their own at
            first sign-in.
          </p>
        </div>
        <Button variant="primary" onClick={() => { setCreating(true); setHandover(null); }}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add staff
        </Button>
      </div>

      {msg ? <p role={msg.ok ? "status" : "alert"} className={`mt-4 rounded-[10px] px-3 py-2 text-sm ${msg.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>{msg.text}</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

      {handover ? (
        <div className="mt-4 rounded-[14px] border border-primary/40 bg-primary-faint p-4 text-sm">
          <p className="font-semibold text-ink">Hand this over to {handover.email} in person or by a channel you trust:</p>
          <p className="tnum mt-2 select-all rounded-[10px] bg-card px-3 py-2 font-mono text-base text-ink">{handover.password}</p>
          <p className="mt-2 text-xs text-ink-soft">Shown once. They sign in at /admin with it and are asked to set their own password right away.</p>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => setHandover(null)}>Done, hide it</Button>
        </div>
      ) : null}

      {creating ? (
        <form onSubmit={create} className="mt-4 grid gap-4 rounded-[14px] border border-line bg-card p-5 text-sm sm:grid-cols-2">
          {fieldErrors.form ? <p role="alert" className="rounded-[10px] bg-danger-soft px-3 py-2 text-danger sm:col-span-2">{fieldErrors.form}</p> : null}
          <div>
            <label htmlFor="st-name" className="mb-1.5 block font-medium text-ink">Name</label>
            <input id="st-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass(fieldErrors.name)} />
            {fieldErrors.name ? <p className="mt-1 text-xs text-danger">{fieldErrors.name}</p> : null}
          </div>
          <div>
            <label htmlFor="st-email" className="mb-1.5 block font-medium text-ink">Email (used to sign in)</label>
            <input id="st-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass(fieldErrors.email)} />
            {fieldErrors.email ? <p className="mt-1 text-xs text-danger">{fieldErrors.email}</p> : null}
          </div>
          <div>
            <label htmlFor="st-role" className="mb-1.5 block font-medium text-ink">Role</label>
            <select id="st-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Staff["role"] })} className={`${inputClass()} cursor-pointer`}>
              <option value="admin">Admin</option>
              <option value="super_admin">Super admin</option>
            </select>
          </div>
          <div>
            <label htmlFor="st-pw" className="mb-1.5 block font-medium text-ink">Temporary password</label>
            <div className="flex gap-2">
              <input id="st-pw" required minLength={10} value={form.tempPassword} onChange={(e) => setForm({ ...form, tempPassword: e.target.value })} className={`${inputClass(fieldErrors.tempPassword)} font-mono`} />
              <Button type="button" variant="outline" onClick={() => setForm({ ...form, tempPassword: tempPassword() })}>New</Button>
            </div>
            {fieldErrors.tempPassword ? <p className="mt-1 text-xs text-danger">{fieldErrors.tempPassword}</p> : <p className="mt-1 text-xs text-ink-faint">At least 10 characters. They must replace it at first sign-in.</p>}
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" variant="primary" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </form>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-[14px] border border-line bg-card">
        {rows === null ? (
          <div className="h-40 animate-pulse bg-sunken" aria-busy="true" />
        ) : (
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-faint">
                <th className="px-4 py-3 font-semibold">Staff</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Last sign-in</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-ink">{s.name}{s.id === me ? " (you)" : ""}</span>
                    <span className="block text-xs text-ink-faint">{s.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Role of ${s.email}`}
                      value={s.role}
                      disabled={busy || s.id === me}
                      onChange={(e) => patch(s, { role: e.target.value }, "Role updated. They were signed out to pick it up.")}
                      className="min-h-9 cursor-pointer rounded-[10px] border border-line-strong bg-card px-2 text-sm text-ink disabled:opacity-60"
                    >
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super admin</option>
                    </select>
                  </td>
                  <td className="tnum px-4 py-3 text-ink-soft">
                    {fmt(s.lastLoginAt)}
                    <span className="block text-xs text-ink-faint">{s.sessions} active session{s.sessions === 1 ? "" : "s"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.active ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>{s.active ? "Active" : "Deactivated"}</span>
                    {s.mustChangePassword ? <span className="ml-1 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">temporary password</span> : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => resetPassword(s)} title="Set a temporary password">
                      <KeyRound className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy || s.sessions === 0} onClick={() => patch(s, { revokeSessions: true }, "Signed out everywhere.")} title="Sign out everywhere">
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    {s.id !== me ? (
                      s.active ? (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => { if (window.confirm(`Deactivate ${s.email}? They cannot sign in until reactivated.`)) void patch(s, { active: false }, "Account deactivated."); }}>
                          <UserX className="h-4 w-4" aria-hidden="true" /> Deactivate
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => patch(s, { active: true }, "Account reactivated.")}>
                          <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Activate
                        </Button>
                      )
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
