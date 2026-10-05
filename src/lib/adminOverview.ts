import "server-only";
import { getPool } from "@/lib/db";
import { storageErrorFromThrown } from "@/lib/storageErrors";

/**
 * Numbers for the admin home. One round trip per block, all cheap
 * (indexed columns, small tables). Times are Bali time (UTC+8).
 */
export interface AdminOverview {
  awaitingPayment: number;
  needsAction: number;
  followUpsDue: number;
  startingSoon: number;
  paidThisMonth: { count: number; revenueIdr: number };
  recent: {
    id: string;
    booking_code: string;
    full_name: string;
    vehicle_model: string;
    quantity: number;
    status: string;
    payment_status: string;
    total_idr: number | null;
    start_at: string;
    created_at: string;
  }[];
  stock: { model: string; total_units: number | null }[];
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const pool = getPool();
  try {
    const [counts, month, recent, stock] = await Promise.all([
      pool.query(`
        select
          count(*) filter (where payment_status = 'pending' and payment_expires_at > now())::int as awaiting_payment,
          count(*) filter (where status = 'new')::int as needs_action,
          count(*) filter (
            where follow_up_at is not null
              and follow_up_at < (date_trunc('day', now() at time zone 'Asia/Makassar') + interval '1 day') at time zone 'Asia/Makassar'
              and status not in ('completed', 'cancelled', 'expired')
          )::int as follow_ups_due,
          count(*) filter (
            where start_at between now() and now() + interval '7 days'
              and status in ('new', 'contacted', 'quoted', 'confirmed')
              and (payment_status = 'paid' or status = 'confirmed')
          )::int as starting_soon
        from bookings`),
      pool.query(`
        select count(*)::int as n, coalesce(sum(total_idr), 0)::bigint as revenue
        from bookings
        where payment_status = 'paid'
          and paid_at >= date_trunc('month', now() at time zone 'Asia/Makassar') at time zone 'Asia/Makassar'`),
      pool.query(`
        select id, booking_code, full_name, vehicle_model, quantity, status, payment_status,
               total_idr, start_at, created_at
        from bookings order by created_at desc limit 6`),
      pool.query("select model, total_units from vehicle_stock order by model"),
    ]);
    const c = counts.rows[0];
    return {
      awaitingPayment: c.awaiting_payment,
      needsAction: c.needs_action,
      followUpsDue: c.follow_ups_due,
      startingSoon: c.starting_soon,
      paidThisMonth: { count: month.rows[0].n, revenueIdr: Number(month.rows[0].revenue) },
      recent: recent.rows.map((r) => ({
        ...r,
        start_at: new Date(r.start_at).toISOString(),
        created_at: new Date(r.created_at).toISOString(),
      })),
      stock: stock.rows,
    };
  } catch (err) {
    throw storageErrorFromThrown("admin_overview", err);
  }
}
