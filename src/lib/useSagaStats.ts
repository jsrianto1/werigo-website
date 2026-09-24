"use client";

import { useEffect, useSyncExternalStore } from "react";
import { REACTIONS, type ReactionId, type ShareChannel } from "@/data/sagaReactions";

export interface Counts {
  views: number;
  shares: number;
  reactions: Record<ReactionId, number>;
}

interface State {
  loaded: boolean;
  episodes: Record<string, Counts>;
  mine: Record<string, ReactionId>;
}

let state: State = { loaded: false, episodes: {}, mine: {} };
const listeners = new Set<() => void>();
let fetching = false;

const emit = () => listeners.forEach((l) => l());
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  emit();
};

/** Anonymous id for this browser (one reaction per browser). No personal data. */
export function clientId(): string {
  const KEY = "werigo-saga-cid";
  try {
    let v = window.localStorage.getItem(KEY);
    if (!v) {
      v = crypto.randomUUID();
      window.localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2, 12);
  }
}

async function load() {
  if (fetching || state.loaded) return;
  fetching = true;
  try {
    const res = await fetch(`/api/saga/stats?cid=${encodeURIComponent(clientId())}`, { cache: "no-store" });
    if (res.ok) {
      const d = (await res.json()) as { episodes: Record<string, Counts>; mine: Record<string, ReactionId> };
      set({ loaded: true, episodes: d.episodes, mine: d.mine });
    }
  } catch {
    /* counters are optional; the comic works without them */
  } finally {
    fetching = false;
  }
}

async function post(body: Record<string, unknown>) {
  try {
    const res = await fetch("/api/saga/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, cid: clientId() }),
    });
    if (!res.ok) return null;
    return (await res.json()) as { counts: Counts; mine?: ReactionId | null };
  } catch {
    return null;
  }
}

const zero = (): Counts => ({
  views: 0,
  shares: 0,
  reactions: Object.fromEntries(REACTIONS.map((r) => [r.id, 0])) as Record<ReactionId, number>,
});

export function countsFor(slug: string): Counts {
  return state.episodes[slug] ?? zero();
}

export function totalReactions(c: Counts) {
  return Object.values(c.reactions).reduce((a, b) => a + b, 0);
}

function putCounts(slug: string, counts: Counts) {
  set({ episodes: { ...state.episodes, [slug]: counts } });
}

/** Count a view once per browser per episode every 6 hours (also enforced on the server). */
export async function recordView(slug: string) {
  const KEY = `werigo-saga-viewed-${slug}`;
  try {
    const last = Number(window.localStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 6 * 60 * 60 * 1000) return;
    window.localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* no storage: the server still de-duplicates */
  }
  const r = await post({ action: "view", slug });
  if (r) putCounts(slug, r.counts);
}

export async function recordShare(slug: string, channel: ShareChannel) {
  const c = countsFor(slug);
  putCounts(slug, { ...c, shares: c.shares + 1 });
  const r = await post({ action: "share", slug, channel });
  if (r) putCounts(slug, r.counts);
}

export async function react(slug: string, reaction: ReactionId | null) {
  const prevMine = state.mine[slug] ?? null;
  const c = countsFor(slug);
  const reactions = { ...c.reactions };
  if (prevMine) reactions[prevMine] = Math.max(0, reactions[prevMine] - 1);
  if (reaction) reactions[reaction] += 1;
  const mine = { ...state.mine };
  if (reaction) mine[slug] = reaction;
  else delete mine[slug];
  set({ mine, episodes: { ...state.episodes, [slug]: { ...c, reactions } } });
  const r = await post({ action: "react", slug, reaction });
  if (r) {
    const m = { ...state.mine };
    if (r.mine) m[slug] = r.mine;
    else delete m[slug];
    set({ mine: m, episodes: { ...state.episodes, [slug]: r.counts } });
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const serverState: State = { loaded: false, episodes: {}, mine: {} };

/** Live counters for every episode (loads once per page). */
export function useSagaStats(): State {
  useEffect(() => {
    load();
  }, []);
  return useSyncExternalStore(subscribe, () => state, () => serverState);
}
