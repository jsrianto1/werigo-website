import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getEpisodes } from "@/data/saga";
import {
  addComment,
  deleteComment,
  listComments,
  phantomComment,
  setHidden,
  StoreFullError,
} from "@/lib/sagaComments";
import { cleanText, hasLink, hasProfanity } from "@/lib/sagaCommentFilter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

const published = () => new Set(getEpisodes().map((e) => e.number));

const clientIp = (req: NextRequest) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";

const fail = (error: string, status: number) =>
  NextResponse.json({ ok: false, error }, { status, headers: NO_STORE });

// ---------- Per-IP posting limit (single-instance deployment, in memory) ----------
// At most one comment every 30 seconds and ten per hour from the same IP.
const GAP_MS = 30 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MAX_PER_HOUR = 10;
const posts = new Map<string, number[]>();

function postLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (posts.get(ip) ?? []).filter((t) => now - t < HOUR_MS);
  posts.set(ip, arr);
  if (arr.length >= MAX_PER_HOUR) return true;
  const last = arr[arr.length - 1];
  return last !== undefined && now - last < GAP_MS;
}

function notePost(ip: string) {
  const now = Date.now();
  const arr = posts.get(ip) ?? [];
  arr.push(now);
  posts.set(ip, arr);
  if (posts.size > 5000) {
    for (const [k, v] of posts) if (v.every((t) => now - t >= HOUR_MS)) posts.delete(k);
  }
}

// Loose limit on reads so the endpoint cannot be hammered.
const READ_WINDOW_MS = 60 * 1000;
const MAX_READS = 120;
const reads = new Map<string, number[]>();

function readLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (reads.get(ip) ?? []).filter((t) => now - t < READ_WINDOW_MS);
  if (arr.length >= MAX_READS) {
    reads.set(ip, arr);
    return true;
  }
  arr.push(now);
  reads.set(ip, arr);
  if (reads.size > 5000) {
    for (const [k, v] of reads) if (v.every((t) => now - t >= READ_WINDOW_MS)) reads.delete(k);
  }
  return false;
}

// ---------- Moderation key (server-only env var) ----------
const digest = (s: string) => createHash("sha256").update(s).digest();

/** null = moderation disabled (no key configured), otherwise whether the header matches. */
function adminCheck(req: NextRequest): boolean | null {
  const key = process.env.SAGA_COMMENTS_ADMIN_KEY?.trim();
  if (!key) return null;
  const given = req.headers.get("x-admin-key")?.trim() ?? "";
  return given.length > 0 && timingSafeEqual(digest(given), digest(key));
}

// ---------- GET /api/saga/comments?episode=N&limit=50&offset=0 ----------
const Query = z.object({
  episode: z.coerce.number().int().positive(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  all: z.enum(["0", "1"]).default("0"),
});

/** Visible comments for one published episode, newest first. Admins can add all=1 to include hidden ones. */
export async function GET(req: NextRequest) {
  if (readLimited(clientIp(req))) return fail("rate_limited", 429);
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const q = Query.safeParse(params);
  if (!q.success || !published().has(q.data.episode)) return fail("invalid_request", 400);
  const includeHidden = q.data.all === "1";
  if (includeHidden && adminCheck(req) !== true) return fail("forbidden", 403);
  return NextResponse.json(
    { ok: true, ...listComments(q.data.episode, q.data.limit, q.data.offset, includeHidden) },
    { headers: NO_STORE },
  );
}

// ---------- POST /api/saga/comments ----------
const NewComment = z.object({
  episode: z.number().int().positive(),
  name: z.string().max(200),
  text: z.string().max(3000),
  website: z.string().max(500).optional(), // honeypot: real visitors never see or fill it
  lang: z.enum(["en", "id"]).default("en"),
});

const ModAction = z.object({
  action: z.enum(["delete", "hide", "unhide"]),
  id: z.string().min(1).max(64),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("invalid_json", 400);
  }

  // Moderation actions share this endpoint: { action, id } with the x-admin-key header.
  if (body && typeof body === "object" && "action" in body) {
    return moderate(req, body);
  }

  const ip = clientIp(req);
  if (postLimited(ip)) return fail("rate_limited", 429);

  const parsed = NewComment.safeParse(body);
  if (!parsed.success || !published().has(parsed.data.episode)) return fail("invalid_request", 400);

  const name = cleanText(parsed.data.name, true);
  const text = cleanText(parsed.data.text, false);
  if (name.length < 1 || name.length > 40 || text.length < 1 || text.length > 600) {
    return fail("invalid_request", 400);
  }
  const lang = parsed.data.lang;

  // Honeypot filled: answer exactly like a success, store nothing.
  if (parsed.data.website && parsed.data.website.trim() !== "") {
    notePost(ip);
    return NextResponse.json({ ok: true, comment: phantomComment({ name, text, lang }) }, { headers: NO_STORE });
  }

  if (hasLink(name) || hasLink(text)) return fail("has_link", 422);
  if (hasProfanity(name) || hasProfanity(text)) return fail("not_allowed", 422);

  try {
    const comment = addComment({ episode: parsed.data.episode, name, text, lang });
    notePost(ip);
    return NextResponse.json({ ok: true, comment }, { status: 201, headers: NO_STORE });
  } catch (err) {
    if (err instanceof StoreFullError) return fail("closed", 503);
    console.error("[saga-comments] write failed:", (err as Error).message);
    return fail("server_error", 500);
  }
}

async function moderate(req: NextRequest, body: unknown) {
  const allowed = adminCheck(req);
  if (allowed === null) return fail("moderation_disabled", 403);
  if (!allowed) return fail("forbidden", 403);
  const parsed = ModAction.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);
  const { action, id } = parsed.data;
  try {
    const found = action === "delete" ? deleteComment(id) : setHidden(id, action === "hide");
    if (!found) return fail("not_found", 404);
    return NextResponse.json({ ok: true, id, action }, { headers: NO_STORE });
  } catch (err) {
    console.error("[saga-comments] moderation write failed:", (err as Error).message);
    return fail("server_error", 500);
  }
}

// ---------- DELETE /api/saga/comments?id=... (x-admin-key) ----------
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  return moderate(req, { action: "delete", id });
}
