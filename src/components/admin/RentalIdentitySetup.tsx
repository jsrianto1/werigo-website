"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
export function RentalIdentitySetup() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function activate() {
    setBusy(true); setMessage("");
    try {
      const res = await fetch("/api/admin/rental-identity/setup", { method: "POST" });
      const data = await res.json();
      setMessage(res.ok && data.ok ? "Rental identity is ready: passport, KTP or KITAS, with an optional driving licence number." : "Setup failed. No partial database changes were committed. Please try again.");
    } catch { setMessage("Could not connect. Please try again."); }
    finally { setBusy(false); }
  }
  return <section className="mt-8 rounded-xl border border-line bg-card p-6"><h2 className="font-display text-xl">Rental identity</h2><p className="mt-2 max-w-xl text-sm text-ink-soft">Apply the database update for KITAS and optional licence numbers. Existing customer documents are retained. Re-running this setup is safe.</p><Button className="mt-4" disabled={busy} onClick={() => void activate()}>{busy ? "Applying update…" : "Activate rental identity update"}</Button>{message && <p role="status" className="mt-3 text-sm">{message}</p>}</section>;
}
