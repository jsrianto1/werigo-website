import "server-only";
import { NextResponse } from "next/server";
import { requireAdmin, isResponse } from "@/lib/adminApi";
import { site } from "@/lib/config";
export async function contentAdmin(superOnly = false) {
  const result = await requireAdmin({ superOnly });
  if (isResponse(result)) return result;
  if (result.mustChangePassword) return NextResponse.json({ ok: false, error: "password_change_required", message: "Set your own password before editing content." }, { status: 403 });
  return result;
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    // Hostinger terminates HTTPS before forwarding to the Node server. Trust
    // the configured public URL, never a client-supplied forwarded-host header.
    const publicOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL || site.baseUrl).origin;
    if (origin === publicOrigin) return true;
    const requestUrl = new URL(req.url);
    return process.env.NODE_ENV !== "production"
      && ["localhost", "127.0.0.1", "[::1]"].includes(requestUrl.hostname)
      && origin === requestUrl.origin;
  } catch { return false; }
}
export async function boundedBody(req: Request, limit: number) {
  if (Number(req.headers.get("content-length") || 0) > limit) throw new RangeError("too_large");
  if (!req.body) return new Uint8Array();
  const reader = req.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  try {
    for (;;) { const { done, value } = await reader.read(); if (done) break; length += value.length;
      if (length > limit) { await reader.cancel(); throw new RangeError("too_large"); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  const output = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
  return output;
}
