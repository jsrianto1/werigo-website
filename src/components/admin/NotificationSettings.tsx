"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Send, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Settings {
  adminNumbers: string[];
  bookingNewAdmin: boolean;
  bookingPaidAdmin: boolean;
  bookingPaidCustomer: boolean;
  payoutRequestedAdmin: boolean;
  payoutPaidCustomer: boolean;
}

interface Entry {
  id: string;
  kind: string;
  target: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
  booking_code: string | null;
  preview: string;
}

const SWITCHES: { key: keyof Omit<Settings, "adminNumbers">; label: string; hint: string }[] = [
  { key: "bookingNewAdmin", label: "New booking request (to staff)", hint: "WhatsApp-mode requests without online payment." },
  { key: "bookingPaidAdmin", label: "Booking paid (to staff)", hint: "The main ops alert: a customer paid." },
  { key: "bookingPaidCustomer", label: "Booking confirmation (to the customer)", hint: "Sent to the number on the booking." },
  { key: "payoutRequestedAdmin", label: "Referral payout requested (to staff)", hint: "" },
  { key: "payoutPaidCustomer", label: "Referral payout transferred (to the customer)", hint: "" },
];

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Makassar", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const inputClass = "min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-sm text-ink placeholder:text-ink-faint";

export function NotificationSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [fonnte, setFonnte] = useState<{ configured: boolean; tokenHint: string | null }>({ configured: false, tokenHint: null });
  const [envNumbers, setEnvNumbers] = useState<string[]>([]);
  const [newNumber, setNewNumber] = useState("");
  const [testNumber, setTestNumber] = useState("");
  const [log, setLog] = useState<Entry[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [s, l] = await Promise.all([
      fetch("/api/admin/settings/notifications", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/notifications", { cache: "no-store" }).then((r) => r.json()),
    ]);
    if (s?.ok) {
      setSettings(s.settings);
      setFonnte(s.fonnte);
      setEnvNumbers(s.envNumbers);
    }
    if (l?.ok) setLog(l.notifications);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch(() => setMsg({ ok: false, text: "Couldn't load settings." }));
  }, [load]);

  async function save(next: Settings) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      const d = await res.json();
      if (!d.ok) return setMsg({ ok: false, text: d.message ?? "Couldn't save." });
      setSettings(d.settings);
      setMsg({ ok: true, text: "Saved." });
    } finally {
      setBusy(false);
    }
  }

  async function test(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings/notifications/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target: testNumber }) });
      const d = await res.json();
      setMsg(d.ok ? { ok: d.sent > 0, text: d.sent > 0 ? "Test message accepted by Fonnte. Check the phone." : `Not sent: ${d.failed > 0 ? "Fonnte rejected it (see the log below)" : "Fonnte is not configured"}.` } : { ok: false, text: d.message ?? "Couldn't send." });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function resend(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/notifications/${id}/resend`, { method: "POST" });
      const d = await res.json();
      setMsg(d.ok ? { ok: true, text: "Queued again and delivery attempted." } : { ok: false, text: d.message ?? "Couldn't resend." });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!settings) return <div><div className="h-72 animate-pulse rounded-[14px] bg-sunken" aria-busy="true" /></div>;

  const numbers = settings.adminNumbers.length > 0 ? settings.adminNumbers : envNumbers;

  return (
    <div>
      <p className="eyebrow">Werigo admin</p>
      <h1 className="font-display text-3xl text-ink">Settings</h1>
      {msg ? <p role={msg.ok ? "status" : "alert"} className={`mt-4 rounded-[10px] px-3 py-2 text-sm ${msg.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>{msg.text}</p> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-[14px] border border-line bg-card p-5 text-sm">
          <h2 className="font-display text-lg text-ink">WhatsApp (Fonnte)</h2>
          <p className="mt-1 text-ink-soft">
            Token: {fonnte.configured ? <span className="tnum font-mono text-ink">{fonnte.tokenHint}</span> : <span className="text-danger">not set</span>}.
            {" "}The token lives in the server environment (FONNTE_TOKEN) and is changed by redeploying; keep the Fonnte phone online.
          </p>

          <h3 className="mt-5 font-semibold text-ink">Staff numbers that receive alerts</h3>
          {settings.adminNumbers.length === 0 ? (
            <p className="mt-1 text-xs text-ink-faint">None set here, so the environment list is used: {envNumbers.join(", ") || "none"}.</p>
          ) : null}
          <ul className="mt-2 space-y-1.5">
            {numbers.map((n) => (
              <li key={n} className="flex items-center justify-between rounded-[10px] bg-sunken px-3 py-2">
                <span className="tnum text-ink">+{n}</span>
                {settings.adminNumbers.includes(n) ? (
                  <button type="button" aria-label={`Remove ${n}`} disabled={busy} onClick={() => save({ ...settings, adminNumbers: settings.adminNumbers.filter((x) => x !== n) })} className="cursor-pointer text-ink-faint hover:text-danger">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : <span className="text-xs text-ink-faint">from environment</span>}
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const n = newNumber.replace(/\D/g, "");
              if (!n) return;
              void save({ ...settings, adminNumbers: [...new Set([...settings.adminNumbers, n])] }).then(() => setNewNumber(""));
            }}
            className="mt-3 flex gap-2"
          >
            <input value={newNumber} onChange={(e) => setNewNumber(e.target.value)} placeholder="628123456789" inputMode="numeric" aria-label="Add a staff number" className={inputClass} />
            <Button type="submit" variant="outline" disabled={busy || !newNumber.trim()}>Add</Button>
          </form>

          <h3 className="mt-6 font-semibold text-ink">What is sent</h3>
          <ul className="mt-2 space-y-2">
            {SWITCHES.map((s) => (
              <li key={s.key}>
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={settings[s.key]} disabled={busy} onChange={(e) => save({ ...settings, [s.key]: e.target.checked })} className="mt-1 h-4 w-4 accent-[var(--brand-primary)]" />
                  <span>
                    <span className="block text-ink">{s.label}</span>
                    {s.hint ? <span className="block text-xs text-ink-faint">{s.hint}</span> : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <h3 className="mt-6 font-semibold text-ink">Send a test message</h3>
          <form onSubmit={test} className="mt-2 flex gap-2">
            <input value={testNumber} onChange={(e) => setTestNumber(e.target.value)} placeholder="628123456789" inputMode="numeric" aria-label="Test number" className={inputClass} />
            <Button type="submit" variant="primary" disabled={busy || !testNumber.trim() || !fonnte.configured}><Send className="h-4 w-4" aria-hidden="true" /> Send</Button>
          </form>
        </section>

        <section className="rounded-[14px] border border-line bg-card p-5 text-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">Delivery log</h2>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void load()}><RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh</Button>
          </div>
          <p className="mt-1 text-xs text-ink-faint">Last 50 messages. Failed ones retry automatically with growing delays; you can also resend by hand.</p>
          {log.length === 0 ? (
            <p className="mt-4 text-ink-soft">No messages yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {log.map((e) => (
                <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-ink">
                      <span className="rounded-full bg-sunken px-2 py-0.5 text-xs font-medium">{e.kind}</span>{" "}
                      <span className="tnum text-xs text-ink-soft">+{e.target}</span>
                      {e.booking_code ? <span className="tnum text-xs text-ink-soft"> · {e.booking_code}</span> : null}
                    </span>
                    <span className="block truncate text-xs text-ink-faint">{e.preview}</span>
                    <span className="tnum block text-xs text-ink-faint">{fmt(e.created_at)}{e.last_error ? ` · ${e.last_error}` : ""}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${e.status === "sent" ? "bg-ok-soft text-ok" : e.status === "failed" ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"}`}>
                      {e.status}{e.status !== "sent" && e.attempts > 0 ? ` (${e.attempts})` : ""}
                    </span>
                    {e.status !== "sent" ? (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => resend(e.id)}>Resend</Button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
