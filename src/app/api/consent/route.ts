import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isDatabaseConfigured, query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
/** Consent records older than this are deleted. */
const RETENTION_DAYS = 730;

// Per-IP sliding window (single-instance deployment), same approach as /api/bookings.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 30;
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

// Purge at most once a day per process, so no extra cron job is needed.
let lastPurge = 0;
async function purgeOld() {
  if (Date.now() - lastPurge < 24 * 60 * 60 * 1000) return;
  lastPurge = Date.now();
  await query(`delete from public.consent_log where created_at < now() - make_interval(days => $1)`, [RETENTION_DAYS]);
}

const Body = z.object({
  consentId: z.uuid(),
  version: z.number().int().min(1).max(1000),
  action: z.enum(["accept_all", "reject_all", "custom"]),
  analytics: z.boolean(),
  marketing: z.boolean(),
  locale: z.enum(["en", "id", "ru"]).optional(),
  path: z.string().trim().max(300).optional(),
});

/** POST /api/consent : record a cookie banner choice. Never blocks the visitor. */
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
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true, stored: false }, { headers: NO_STORE });
  }
  const b = parsed.data;
  try {
    await query(
      `insert into public.consent_log (consent_id, version, action, analytics, marketing, locale, path)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [b.consentId, b.version, b.action, b.analytics, b.marketing, b.locale ?? null, b.path ?? null],
    );
    await purgeOld().catch(() => {});
    return NextResponse.json({ ok: true, stored: true }, { status: 201, headers: NO_STORE });
  } catch (err) {
    console.error(`[consent] insert failed: ${err instanceof Error ? err.message.slice(0, 200) : "unknown"}`);
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503, headers: NO_STORE });
  }
}
