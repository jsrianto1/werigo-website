import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getAdmin } from "@/lib/adminAuth";
export const runtime = "nodejs";
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return new NextResponse(null, { status: 404 });
  try {
    const result = await query("select body,mime,public,sha256 from werigo_cms_media where id=$1", [id]);
    const row = result.rows[0]; if (!row) return new NextResponse(null, { status: 404 });
    if (!row.public) { const admin = await getAdmin(); if (!admin || admin.mustChangePassword) return new NextResponse(null, { status: 404 }); }
    const etag = `"${row.sha256}"`;
    const headers = { "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff", "Cache-Control": row.public ? "public, max-age=31536000, immutable" : "private, no-store", "ETag": etag };
    if (row.public && req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers });
    return new NextResponse(new Uint8Array(row.body), { headers });
  } catch { return new NextResponse(null, { status: 404 }); }
}
