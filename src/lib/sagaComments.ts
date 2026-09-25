import "server-only";
import { randomBytes } from "node:crypto";
import { readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sagaDataDir } from "@/lib/sagaStats";

/**
 * Reader comments for WERIGO SAGA episodes. Same storage approach as the
 * view and reaction counters (src/lib/sagaStats.ts): one JSON file,
 * saga-comments.json, in the saga data folder (SAGA_DATA_DIR, else
 * ~/.werigo-data), outside the app folder so deploys never wipe it.
 *
 * Single Node process, so an in-memory copy is the source of truth. Every
 * change is written straight away and atomically (temp file + rename).
 * If the file is edited by hand while the server runs, the newer file is
 * picked up on the next request (mtime check).
 *
 * Only what the reader typed is stored (name, text, language). No IP
 * address, email or browser id.
 */

export type CommentLang = "en" | "id";

export interface StoredComment {
  id: string;
  episode: number;
  name: string;
  text: string;
  createdAt: string; // ISO 8601
  lang: CommentLang;
  hidden?: boolean; // moderation: kept on disk but never served publicly
}

export type PublicComment = Omit<StoredComment, "hidden" | "episode">;

interface StoreFile {
  v: 1;
  comments: StoredComment[];
}

const FILE_NAME = "saga-comments.json";
/** Hard ceiling so a flood can never fill the disk. */
const MAX_TOTAL = 20000;

let data: StoreFile | null = null;
let loadedMtime = 0;

const filePath = () => join(sagaDataDir(), FILE_NAME);

function mtimeOf(path: string): number {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}

function load(): StoreFile {
  const path = filePath();
  const mtime = mtimeOf(path);
  if (data && mtime === loadedMtime) return data;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as StoreFile;
    data = raw && raw.v === 1 && Array.isArray(raw.comments) ? raw : { v: 1, comments: [] };
  } catch {
    data = data ?? { v: 1, comments: [] };
  }
  loadedMtime = mtime;
  return data;
}

function save() {
  const target = filePath();
  const tmp = `${target}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data));
  renameSync(tmp, target);
  loadedMtime = mtimeOf(target);
}

const toPublic = ({ id, name, text, createdAt, lang }: StoredComment): PublicComment => ({
  id,
  name,
  text,
  createdAt,
  lang,
});

/** Visible comments for one episode, newest first. */
export function listComments(episode: number, limit: number, offset: number, includeHidden = false) {
  const all = load()
    .comments.filter((c) => c.episode === episode && (includeHidden || !c.hidden))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const slice = all.slice(offset, offset + limit);
  return {
    total: all.length,
    comments: includeHidden ? slice : slice.map(toPublic),
    hasMore: offset + limit < all.length,
  };
}

export class StoreFullError extends Error {}

export function addComment(input: { episode: number; name: string; text: string; lang: CommentLang }): PublicComment {
  const store = load();
  if (store.comments.length >= MAX_TOTAL) throw new StoreFullError("comment store is full");
  const comment: StoredComment = {
    id: randomBytes(9).toString("base64url"),
    episode: input.episode,
    name: input.name,
    text: input.text,
    createdAt: new Date().toISOString(),
    lang: input.lang,
  };
  store.comments.push(comment);
  try {
    save();
  } catch (err) {
    store.comments.pop();
    throw err;
  }
  return toPublic(comment);
}

/** Builds the comment a real submission would get, without storing it (honeypot hits). */
export function phantomComment(input: { name: string; text: string; lang: CommentLang }): PublicComment {
  return {
    id: randomBytes(9).toString("base64url"),
    name: input.name,
    text: input.text,
    createdAt: new Date().toISOString(),
    lang: input.lang,
  };
}

/** Moderation: permanently remove one comment. Returns false if the id is unknown. */
export function deleteComment(id: string): boolean {
  const store = load();
  const i = store.comments.findIndex((c) => c.id === id);
  if (i === -1) return false;
  const [removed] = store.comments.splice(i, 1);
  try {
    save();
  } catch (err) {
    store.comments.splice(i, 0, removed);
    throw err;
  }
  return true;
}

/** Moderation: hide or show one comment. Returns false if the id is unknown. */
export function setHidden(id: string, hidden: boolean): boolean {
  const store = load();
  const c = store.comments.find((x) => x.id === id);
  if (!c) return false;
  const before = c.hidden;
  if (hidden) c.hidden = true;
  else delete c.hidden;
  try {
    save();
  } catch (err) {
    if (before) c.hidden = true;
    else delete c.hidden;
    throw err;
  }
  return true;
}
