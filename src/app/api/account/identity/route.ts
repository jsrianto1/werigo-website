import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getIdentity, identityLocked, IdentityTakenError, saveIdentity } from "@/lib/identity";
import { identitySchema } from "@/lib/identitySchema";
import { logStorageError, storageErrorFromThrown } from "@/lib/storageErrors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The signed-in customer's identity documents (own data only). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  try {
    const [identity, locked] = await Promise.all([getIdentity(user.id), identityLocked(user.id)]);
    return NextResponse.json({ ok: true, complete: identity !== null, locked, identity });
  } catch (err) {
    logStorageError(storageErrorFromThrown("get_identity", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}

/** Save identity documents. Required before booking; fixed after a paid booking. */
export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });

  const parsed = identitySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json({ ok: false, error: "validation", fieldErrors }, { status: 422 });
  }

  try {
    const existing = await getIdentity(user.id);
    if (existing && (await identityLocked(user.id))) {
      const unchanged =
        existing.idType === parsed.data.idType &&
        existing.idNumber === parsed.data.idNumber &&
        existing.drivingLicenseNumber === parsed.data.drivingLicenseNumber;
      if (!unchanged) {
        return NextResponse.json(
          {
            ok: false,
            error: "locked",
            message: "Your documents are linked to a paid booking. Message us on WhatsApp to change them.",
          },
          { status: 409 }
        );
      }
    }
    const identity = await saveIdentity(user.id, parsed.data);
    return NextResponse.json({ ok: true, complete: true, identity });
  } catch (err) {
    if (err instanceof IdentityTakenError) {
      return NextResponse.json(
        {
          ok: false,
          error: "identity_taken",
          fieldErrors: { idNumber: "This document is already registered to another Werigo account." },
        },
        { status: 409 }
      );
    }
    logStorageError(storageErrorFromThrown("save_identity", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
