import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/adminAuth";
import { getCustomerStore } from "@/lib/customerStore";
import { logStorageError, storageErrorFromThrown } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const CUSTOMER_STATUSES = [
  "lead", "contacted", "customer", "archived", "blocked",
] as const;

const patchSchema = z.object({
  status: z.enum(CUSTOMER_STATUSES).optional(),
  internal_notes: z.string().max(5000).optional(),
  assigned_to: z.string().max(200).optional(),
  marketing_consent: z.boolean().optional(),
});

interface Ctx {
  params: Promise<{ id: string }>;
}

/** One customer with every form they have ever submitted. */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    const result = await getCustomerStore().getCustomer(id);
    if (!result) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logStorageError(storageErrorFromThrown("admin_get_customer", err));
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
    const customer = await getCustomerStore().updateCustomer(id, parsed.data);
    if (!customer) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, customer });
  } catch (err) {
    logStorageError(storageErrorFromThrown("admin_update_customer", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
