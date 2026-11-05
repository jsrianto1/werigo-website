import "server-only";
import { NextResponse } from "next/server";
import { requireAdmin, isResponse } from "@/lib/adminApi";
export async function contentAdmin(superOnly = false) {
  const result = await requireAdmin({ superOnly });
  if (isResponse(result)) return result;
  if (result.mustChangePassword) return NextResponse.json({ ok: false, error: "password_change_required", message: "Set your own password before editing content." }, { status: 403 });
  return result;
}
export function sameOrigin(req: Request) { return req.headers.get("origin") === new URL(req.url).origin; }
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
