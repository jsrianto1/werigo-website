import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/adminAuth";
import { getBookingStore } from "@/lib/bookingStore";

export const runtime = "nodejs";

const STATUSES = [
  "new", "contacted", "quoted", "confirmed",
  "active", "completed", "cancelled", "no_response",
] as const;

const patchSchema = z.object({
  status: z.enum(STATUSES).optional(),
  internal_notes: z.string().max(5000).optional(),
  assigned_to: z.string().max(200).optional(),
  follow_up_at: z.iso.datetime({ offset: true }).nullable().optional(),
});

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    const result = await getBookingStore().get(id);
    if (!result) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  }
  try {
    const booking = await getBookingStore().update(id, parsed.data, admin.email);
    if (!booking) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, booking });
  } catch {
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
