import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getEpisodes } from "@/data/saga";
import { REACTION_IDS, SHARE_CHANNELS } from "@/data/sagaReactions";
import { addShare, addView, getAll, setReaction, storageInfo } from "@/lib/sagaStats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const CID = /^[A-Za-z0-9-]{8,64}$/;

// Per-IP sliding window (single-instance deployment), same approach as /api/bookings.
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 40;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) {
    hits.set(ip, arr);
    return true;
  }
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return false;
}

const slugs = () => getEpisodes().map((e) => e.slug);

/** GET /api/saga/stats?cid=... : counts for every published episode (+ this browser's reactions). */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (url.searchParams.get("health") === "1") {
    return NextResponse.json(storageInfo(), { headers: NO_STORE });
  }
  const cid = url.searchParams.get("cid") ?? undefined;
  return NextResponse.json(getAll(slugs(), cid && CID.test(cid) ? cid : undefined), { headers: NO_STORE });
}

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("view"), slug: z.string(), cid: z.string().regex(CID) }),
  z.object({ action: z.literal("share"), slug: z.string(), cid: z.string().regex(CID), channel: z.enum(SHARE_CHANNELS) }),
  z.object({ action: z.literal("react"), slug: z.string(), cid: z.string().regex(CID), reaction: z.enum(REACTION_IDS).nullable() }),
]);

/** POST /api/saga/stats : count a view or share, or set this browser's reaction. */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429, headers: NO_STORE });
  }
  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }
  if (!parsed.success || !slugs().includes(parsed.data.slug)) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }
  const b = parsed.data;
  if (b.action === "view") {
    return NextResponse.json({ ok: true, counts: addView(b.slug, b.cid) }, { headers: NO_STORE });
  }
  if (b.action === "share") {
    return NextResponse.json({ ok: true, counts: addShare(b.slug, b.cid, b.channel) }, { headers: NO_STORE });
  }
  const res = setReaction(b.slug, b.cid, b.reaction);
  return NextResponse.json({ ok: true, ...res }, { headers: NO_STORE });
}
