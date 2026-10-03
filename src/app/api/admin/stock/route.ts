import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/adminAuth";
import { listStock, MODELS, setStock } from "@/lib/stock";
import { logAudit, requestIp } from "@/lib/audit";
import { logStorageError, storageErrorFromThrown } from "@/lib/storageErrors";
import { WHATSAPP_FIRST_BOOKING } from "@/lib/bookingMode";

export const runtime = "nodejs";

/** Units per model. `totalUnits: null` = not tracked (never sells out). */
const putSchema = z.object({
  model: z.enum(MODELS),
  totalUnits: z.number().int().min(0).max(1000).nullable(),
});

export async function GET() {
  if (WHATSAPP_FIRST_BOOKING) {
    return NextResponse.json({ ok: false, error: "storage_disabled" }, { status: 503 });
  }
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, stock: await listStock() });
  } catch (err) {
    logStorageError(storageErrorFromThrown("admin_stock_list", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}

export async function PUT(req: NextRequest) {
  if (WHATSAPP_FIRST_BOOKING) {
    return NextResponse.json({ ok: false, error: "storage_disabled" }, { status: 503 });
  }
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  try {
    const row = await setStock(parsed.data.model, parsed.data.totalUnits);
    await logAudit({
      actor: admin,
      action: "stock.update",
      entityType: "vehicle_stock",
      entityId: parsed.data.model,
      meta: { totalUnits: parsed.data.totalUnits },
      ip: requestIp(req),
    });
    return NextResponse.json({ ok: true, stock: row });
  } catch (err) {
    logStorageError(storageErrorFromThrown("admin_stock_update", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
