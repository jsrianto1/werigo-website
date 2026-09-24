"use client";

import { useEffect, useSyncExternalStore } from "react";

export type SagaLang = "en" | "id";

const KEY = "werigo-saga-lang";
const EVENT = "werigo-saga-lang";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

function snapshot(): SagaLang {
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === "en" || v === "id") return v;
  } catch {
    /* storage blocked */
  }
  return navigator.language?.toLowerCase().startsWith("id") ? "id" : "en";
}

export function setSagaLang(lang: SagaLang) {
  try {
    window.localStorage.setItem(KEY, lang);
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Reading language for WERIGO SAGA (comic pages and saga UI). English on
 * the server and during hydration; then the saved choice, or Indonesian
 * when the browser language is Indonesian. A ?lang=id or ?lang=en link
 * sets the choice.
 */
export function useSagaLang(): SagaLang {
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("lang");
    if (q === "en" || q === "id") setSagaLang(q);
  }, []);
  return useSyncExternalStore(subscribe, snapshot, () => "en");
}
