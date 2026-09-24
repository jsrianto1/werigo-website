"use client";

import { useMemo, useSyncExternalStore } from "react";
import { readProgress, type SagaProgress } from "@/lib/sagaProgress";

const EVENT = "werigo-saga-progress";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

function snapshot() {
  try {
    return window.localStorage.getItem("werigo-saga-progress-v1") ?? "";
  } catch {
    return "";
  }
}

/** Tell subscribers in this tab that progress changed. */
export function notifySagaProgress() {
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Saved reading progress, or null during server render and hydration
 * (so markup matches) until the browser snapshot is read.
 */
export function useSagaProgress(): SagaProgress | null {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  return useMemo(() => (raw === null ? null : readProgress()), [raw]);
}
