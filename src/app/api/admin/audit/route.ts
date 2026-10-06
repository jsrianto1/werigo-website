import { NextRequest, NextResponse } from "next/server";
import { isResponse, requireAdmin, storageFailed } from "@/lib/adminApi";
import { exportAudit, listAudit } from "@/lib/auditLog";

export const runtime = "nodejs";

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Audit trail with filters (super admin). `?format=csv` downloads the current page. */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin({ superOnly: true });
  if (isResponse(admin)) return admin;
  const p = req.nextUrl.searchParams;
  const q = {
    actor: p.get("actor") ?? undefined,
    action: p.get("action") ?? undefined,
    from: p.get("from") ?? undefined,
    to: p.get("to") ?? undefined,
    page: Number(p.get("page") ?? 1),
    pageSize: Number(p.get("pageSize") ?? 50),
  };
  try {
    if (p.get("format") === "csv") {
      const rows = await exportAudit(q);
      const cols = ["createdAt", "actorEmail", "actorRole", "action", "entityType", "entityId", "ip", "meta"] as const;
      const lines = [cols.join(","), ...rows.map((r) => cols.map((c) => csvEscape(r[c])).join(","))];
      return new NextResponse(lines.join("\r\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="werigo-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }
    return NextResponse.json({ ok: true, ...(await listAudit(q)) });
  } catch (err) {
    return storageFailed("admin_audit", err);
  }
}
