"use client";

import { useEffect, useState } from "react";

/**
 * Client hook for the cached USD to IDR rate. One fetch per page
 * load (module-level promise cache) against our own cached
 * /api/exchange-rate route, never against the external service.
 * Returns null while loading or when unavailable: callers render
 * IDR only in that case.
 */
let cached: Promise<number | null> | null = null;

function loadRate(): Promise<number | null> {
  cached ??= fetch("/api/exchange-rate")
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => (typeof data?.rate === "number" && data.rate > 0 ? data.rate : null))
    .catch(() => null);
  return cached;
}

export function useUsdRate(): number | null {
  const [rate, setRate] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    loadRate().then((r) => {
      if (alive && r !== null) setRate(r);
    });
    return () => {
      alive = false;
    };
  }, []);
  return rate;
}
