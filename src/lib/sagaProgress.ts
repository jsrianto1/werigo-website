/**
 * Reading progress for WERIGO SAGA, stored only in this browser
 * (localStorage). Nothing is sent anywhere. Every access is wrapped
 * because storage can be blocked (private mode, disabled site data).
 */
const KEY = "werigo-saga-progress-v1";

export interface SagaProgress {
  last: string | null;
  pos: Record<string, number>;
  done: string[];
}

const empty = (): SagaProgress => ({ last: null, pos: {}, done: [] });

export function readProgress(): SagaProgress {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<SagaProgress>;
    return {
      last: typeof parsed.last === "string" ? parsed.last : null,
      pos: parsed.pos && typeof parsed.pos === "object" ? parsed.pos : {},
      done: Array.isArray(parsed.done) ? parsed.done : [],
    };
  } catch {
    return empty();
  }
}

export function saveProgress(slug: string, fraction: number) {
  try {
    const p = readProgress();
    p.last = slug;
    p.pos[slug] = Math.round(fraction * 1000) / 1000;
    if (fraction > 0.92 && !p.done.includes(slug)) p.done.push(slug);
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: reading still works, progress is just not kept */
  }
}
