import { NextRequest, NextResponse } from "next/server";
import { isResponse, requireAdmin, storageFailed } from "@/lib/adminApi";
import { listCustomers, type CustomerStatus } from "@/lib/customers";

export const runtime = "nodejs";

/** Customer list with search and filters (all staff). */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  const p = req.nextUrl.searchParams;
  try {
    const result = await listCustomers({
      search: p.get("search") ?? undefined,
      status: (p.get("status") as CustomerStatus | "") ?? "",
      booked: (p.get("booked") as "yes" | "no" | "") ?? "",
      page: Number(p.get("page") ?? 1),
      pageSize: Number(p.get("pageSize") ?? 25),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return storageFailed("admin_customers", err);
  }
}
