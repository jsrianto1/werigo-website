import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/adminAuth";
import { getCustomerStore } from "@/lib/customerStore";
import { logStorageError, storageErrorFromThrown } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const SUBMISSION_STATUSES = ["new", "contacted", "handled", "spam", "archived"] as const;

const patchSchema = z.object({
  status: z.enum(SUBMISSION_STATUSES).optional(),
  internal_notes: z.string().max(5000).optional(),
});

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * Follow-up state for one submission. The submitted values themselves
 * are never edited: what the visitor typed stays as it was received.
 */
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
    const submission = await getCustomerStore().updateSubmission(id, parsed.data);
    if (!submission) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, submission });
  } catch (err) {
    logStorageError(storageErrorFromThrown("admin_update_submission", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
