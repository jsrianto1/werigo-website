"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { clearAppPickup } from "@/lib/appPickup";
export function AppSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setBusy(true); setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw Error("signout_failed");
      try { clearAppPickup(sessionStorage); } catch { /* No pin storage available. */ }
      router.replace("/app/login"); router.refresh();
    } catch { setError("Couldn’t sign out. Please try again."); setBusy(false); }
  }
  return <div><button className="ra-button" disabled={busy} onClick={() => void signOut()}>{busy ? "Signing out…" : "Sign out"}</button>{error && <p className="wr-error" role="alert">{error}</p>}</div>;
}
