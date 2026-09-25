import "server-only";
import { mkdirSync, readFileSync, renameSync, writeFileSync, accessSync, constants } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { REACTIONS, type ReactionId } from "@/data/sagaReactions";

/**
 * Public counters for WERIGO SAGA: views, shares and reactions per
 * episode. The live site has no reachable database, so counts live in
 * one JSON file on the server, outside the app folder so deploys do not
 * wipe it: SAGA_DATA_DIR, else ~/.werigo-data, else the OS temp dir
 * (reported as not persistent). Single Node process, so an in-memory
 * copy is the source of truth and writes are debounced and atomic.
 *
 * Only an anonymous browser id is stored (for one-reaction-per-browser),
 * never an IP address or any personal data.
 */

export interface EpisodeCounts {
  views: number;
  shares: number;
  reactions: Record<ReactionId, number>;
}

interface EpisodeRecord extends EpisodeCounts {
  voters: Record<string, ReactionId>;
}

interface StoreFile {
  v: 1;
  episodes: Record<string, EpisodeRecord>;
}

const FILE_NAME = "saga-stats.json";
let dir: string | null = null;
let persistent = false;
let data: StoreFile | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function writable(path: string): boolean {
  try {
    mkdirSync(path, { recursive: true });
    accessSync(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveDir(): string {
  if (dir) return dir;
  const candidates = [process.env.SAGA_DATA_DIR?.trim(), join(homedir(), ".werigo-data")].filter(Boolean) as string[];
  for (const c of candidates) {
    if (writable(c)) {
      dir = c;
      persistent = true;
      return dir;
    }
  }
  dir = join(tmpdir(), "werigo-data");
  writable(dir);
  persistent = false;
  return dir;
}

const emptyReactions = () =>
  Object.fromEntries(REACTIONS.map((r) => [r.id, 0])) as Record<ReactionId, number>;

function load(): StoreFile {
  if (data) return data;
  try {
    const raw = JSON.parse(readFileSync(join(resolveDir(), FILE_NAME), "utf8")) as StoreFile;
    data = raw && raw.v === 1 && raw.episodes ? raw : { v: 1, episodes: {} };
  } catch {
    data = { v: 1, episodes: {} };
  }
  return data;
}

function flushSoon() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    try {
      const target = join(resolveDir(), FILE_NAME);
      const tmp = `${target}.${process.pid}.tmp`;
      writeFileSync(tmp, JSON.stringify(data));
      renameSync(tmp, target);
    } catch (err) {
      console.error("[saga-stats] write failed:", (err as Error).message);
    }
  }, 1500);
}

function record(slug: string): EpisodeRecord {
  const store = load();
  let rec = store.episodes[slug];
  if (!rec) {
    rec = { views: 0, shares: 0, reactions: emptyReactions(), voters: {} };
    store.episodes[slug] = rec;
  }
  for (const r of REACTIONS) rec.reactions[r.id] ??= 0;
  return rec;
}

function publicCounts(rec: EpisodeRecord): EpisodeCounts {
  return { views: rec.views, shares: rec.shares, reactions: { ...rec.reactions } };
}

/** The shared saga data folder (the comments store keeps its own file here too). */
export function sagaDataDir(): string {
  return resolveDir();
}

export function storageInfo() {
  resolveDir();
  return { persistent };
}

export function getAll(slugs: string[], cid?: string) {
  const episodes: Record<string, EpisodeCounts> = {};
  const mine: Record<string, ReactionId> = {};
  for (const s of slugs) {
    const rec = record(s);
    episodes[s] = publicCounts(rec);
    if (cid && rec.voters[cid]) mine[s] = rec.voters[cid];
  }
  return { episodes, mine };
}

// Repeat views and shares from the same browser are ignored for a while.
const VIEW_WINDOW = 6 * 60 * 60 * 1000;
const SHARE_WINDOW = 10 * 60 * 1000;
const recent = new Map<string, number>();

function seenRecently(key: string, windowMs: number): boolean {
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < windowMs) return true;
  recent.set(key, now);
  if (recent.size > 20000) {
    for (const [k, t] of recent) if (now - t > VIEW_WINDOW) recent.delete(k);
  }
  return false;
}

export function addView(slug: string, cid: string) {
  const rec = record(slug);
  if (!seenRecently(`v:${slug}:${cid}`, VIEW_WINDOW)) {
    rec.views += 1;
    flushSoon();
  }
  return publicCounts(rec);
}

export function addShare(slug: string, cid: string, channel: string) {
  const rec = record(slug);
  if (!seenRecently(`s:${slug}:${cid}:${channel}`, SHARE_WINDOW)) {
    rec.shares += 1;
    flushSoon();
  }
  return publicCounts(rec);
}

/** One reaction per browser per episode; null removes it. */
export function setReaction(slug: string, cid: string, reaction: ReactionId | null) {
  const rec = record(slug);
  const prev = rec.voters[cid];
  if (prev !== reaction) {
    if (prev) rec.reactions[prev] = Math.max(0, rec.reactions[prev] - 1);
    if (reaction) {
      rec.reactions[reaction] += 1;
      rec.voters[cid] = reaction;
    } else {
      delete rec.voters[cid];
    }
    flushSoon();
  }
  return { counts: publicCounts(rec), mine: rec.voters[cid] ?? null };
}
