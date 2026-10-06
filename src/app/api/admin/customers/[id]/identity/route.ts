import { NextRequest, NextResponse } from "next/server";
import { fieldErrors, isResponse, requireAdmin, storageFailed } from "@/lib/adminApi";
import { IdentityTakenError, saveIdentity } from "@/lib/identity";
import { identitySchema } from "@/lib/identitySchema";
import { logAudit, requestIp } from "@/lib/audit";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** Correct a customer's rider documents (super admin; the customer cannot after a paid booking). */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin({ superOnly: true });
  if (isResponse(admin)) return admin;
  const { id } = await ctx.params;
  const parsed = identitySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) }, { status: 422 });
  try {
    const identity = await saveIdentity(id, parsed.data);
    await logAudit({ actor: admin, action: "customer.identity", entityType: "customer", entityId: id, meta: { idType: parsed.data.idType }, ip: requestIp(req) });
    return NextResponse.json({ ok: true, identity });
  } catch (err) {
    if (err instanceof IdentityTakenError) {
      return NextResponse.json({ ok: false, error: "identity_taken", fieldErrors: { idNumber: "This document is registered to another account." } }, { status: 409 });
    }
    return storageFailed("admin_customer_identity", err);
  }
}
