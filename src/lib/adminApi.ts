import "server-only";
import { NextResponse } from "next/server";
import { getAdmin, type AdminIdentity } from "@/lib/adminAuth";
import { logStorageError, storageErrorFromThrown } from "@/lib/storageErrors";

/** Shared guards and answers for /api/admin routes. */

export async function requireAdmin(opts: { superOnly?: boolean } = {}): Promise<AdminIdentity | NextResponse> {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (opts.superOnly && admin.role !== "super_admin") {
    return NextResponse.json({ ok: false, error: "forbidden", message: "Super admin only." }, { status: 403 });
  }
  return admin;
}

export function isResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}

export function storageFailed(operation: string, err: unknown): NextResponse {
  logStorageError(storageErrorFromThrown(operation, err));
  return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
}

/** First message per field from a zod error. */
export function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = String(i.path[0] ?? "form");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}
