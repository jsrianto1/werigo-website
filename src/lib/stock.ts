import "server-only";
import type { PoolClient } from "pg";
import { getPool } from "@/lib/db";
import { storageErrorFromThrown } from "@/lib/storageErrors";

/**
 * Per-model unit stock (v1). `total_units` NULL means the model is
 * not tracked and never sells out. A booking "commits" units while it
 * is paid, or pending payment and not yet expired, or confirmed by the
 * team outside the online flow.
 */

export const MODELS = ["bees", "victory", "athena", "edpower"] as const;
export type ModelSlug = (typeof MODELS)[number];

export interface StockRow {
  model: ModelSlug;
  total_units: number | null;
  updated_at: string;
}

export async function listStock(): Promise<StockRow[]> {
  try {
    const res = await getPool().query(
      "select model, total_units, updated_at from vehicle_stock order by model"
    );
    return res.rows.map((r) => ({ ...r, updated_at: new Date(r.updated_at).toISOString() }));
  } catch (err) {
    throw storageErrorFromThrown("list_stock", err);
  }
}

export async function setStock(model: ModelSlug, totalUnits: number | null): Promise<StockRow> {
  try {
    const res = await getPool().query(
      `insert into vehicle_stock (model, total_units) values ($1::vehicle_model, $2)
       on conflict (model) do update set total_units = excluded.total_units
       returning model, total_units, updated_at`,
      [model, totalUnits]
    );
    const r = res.rows[0];
    return { ...r, updated_at: new Date(r.updated_at).toISOString() };
  } catch (err) {
    throw storageErrorFromThrown("set_stock", err);
  }
}

/** Bookings that currently hold units of a model in a period ($1 model, $2 start, $3 end). */
export const COMMITTED_BOOKINGS_SQL = `
  vehicle_model = $1::vehicle_model
  and start_at < $3::timestamptz and end_at > $2::timestamptz
  and (
    payment_status = 'paid'
    or (payment_status = 'pending' and payment_expires_at > now())
    or (payment_status = 'unpaid' and status in ('confirmed', 'active'))
  )`;

export interface Availability {
  total: number | null;
  committed: number;
  /** null = not tracked (unlimited) */
  available: number | null;
}

/**
 * Units still available for `model` between start and end. Locks the
 * stock row so two checkouts cannot both take the last unit; call it
 * inside the booking transaction.
 */
export async function availableUnitsLocked(
  client: PoolClient,
  model: string,
  startAt: string,
  endAt: string
): Promise<Availability> {
  const stock = await client.query(
    "select total_units from vehicle_stock where model = $1::vehicle_model for update",
    [model]
  );
  const total: number | null = stock.rows[0]?.total_units ?? null;
  const committedRes = await client.query(
    `select coalesce(sum(quantity), 0)::int as n from bookings where ${COMMITTED_BOOKINGS_SQL}`,
    [model, startAt, endAt]
  );
  const committed: number = committedRes.rows[0]?.n ?? 0;
  return { total, committed, available: total === null ? null : Math.max(0, total - committed) };
}

/** Read-only availability check (no lock), for the UI before checkout. */
export async function availableUnits(model: string, startAt: string, endAt: string): Promise<Availability> {
  try {
    const pool = getPool();
    const [stock, committedRes] = await Promise.all([
      pool.query("select total_units from vehicle_stock where model = $1::vehicle_model", [model]),
      pool.query(
        `select coalesce(sum(quantity), 0)::int as n from bookings where ${COMMITTED_BOOKINGS_SQL}`,
        [model, startAt, endAt]
      ),
    ]);
    const total: number | null = stock.rows[0]?.total_units ?? null;
    const committed: number = committedRes.rows[0]?.n ?? 0;
    return { total, committed, available: total === null ? null : Math.max(0, total - committed) };
  } catch (err) {
    throw storageErrorFromThrown("check_stock", err);
  }
}
