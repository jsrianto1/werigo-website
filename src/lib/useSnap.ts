"use client";

import { useCallback, useRef } from "react";

/**
 * Loads Midtrans snap.js on demand and opens the payment popup.
 * The client key and environment are public build-time values.
 */
export type SnapOutcome = "success" | "pending" | "error" | "closed";

interface SnapResult {
  order_id?: string;
  transaction_status?: string;
  status_message?: string;
}

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: (r: SnapResult) => void;
          onPending?: (r: SnapResult) => void;
          onError?: (r: SnapResult) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

const CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY?.trim() ?? "";
const SCRIPT_URL =
  (process.env.NEXT_PUBLIC_MIDTRANS_ENV?.trim().toLowerCase() ?? "sandbox") === "production"
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

export const SNAP_CONFIGURED = CLIENT_KEY.length > 0;

let loading: Promise<void> | null = null;

function loadSnap(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.snap) return Promise.resolve();
  if (!CLIENT_KEY) return Promise.reject(new Error("payment not configured"));
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.setAttribute("data-client-key", CLIENT_KEY);
    s.async = true;
    s.onload = () => (window.snap ? resolve() : reject(new Error("snap.js did not initialise")));
    s.onerror = () => {
      loading = null;
      reject(new Error("could not load snap.js"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export function useSnap() {
  const busy = useRef(false);

  /** Resolves with the outcome once the popup closes; never rejects for user actions. */
  const pay = useCallback(async (token: string): Promise<{ outcome: SnapOutcome; result?: SnapResult }> => {
    if (busy.current) return { outcome: "closed" };
    busy.current = true;
    try {
      await loadSnap();
      return await new Promise((resolve) => {
        window.snap!.pay(token, {
          onSuccess: (result) => resolve({ outcome: "success", result }),
          onPending: (result) => resolve({ outcome: "pending", result }),
          onError: (result) => resolve({ outcome: "error", result }),
          onClose: () => resolve({ outcome: "closed" }),
        });
      });
    } catch (err) {
      return { outcome: "error", result: { status_message: err instanceof Error ? err.message : String(err) } };
    } finally {
      busy.current = false;
    }
  }, []);

  /** Warm the script while the customer is still filling the form. */
  const preload = useCallback(() => {
    void loadSnap().catch(() => {});
  }, []);

  return { pay, preload, configured: SNAP_CONFIGURED };
}
