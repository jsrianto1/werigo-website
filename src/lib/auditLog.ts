import "server-only";
import { getPool } from "@/lib/db";
import { storageErrorFromThrown } from "@/lib/storageErrors";

/** Read side of the audit trail (writes are in src/lib/audit.ts). */

export interface AuditRow {
  id: number;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}

export interface AuditQuery {
  actor?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

function where(q: AuditQuery): { sql: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (q.actor?.trim()) {
    params.push(`%${q.actor.trim()}%`);
    clauses.push(`actor_email ilike $${params.length}`);
  }
  if (q.action?.trim()) {
    params.push(`${q.action.trim()}%`);
    clauses.push(`action like $${params.length}`);
  }
  if (q.from) {
    params.push(q.from);
    clauses.push(`created_at >= $${params.length}::timestamptz`);
  }
  if (q.to) {
    params.push(q.to);
    clauses.push(`created_at <= $${params.length}::timestamptz`);
  }
  return { sql: clauses.length ? `where ${clauses.join(" and ")}` : "", params };
}

export async function listAudit(q: AuditQuery): Promise<{ rows: AuditRow[]; total: number; actions: string[] }> {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, q.pageSize ?? 50));
  const { sql, params } = where(q);
  try {
    const pool = getPool();
    const [res, actions] = await Promise.all([
      pool.query(
        `select *, count(*) over() as total_count from audit_log ${sql}
         order by id desc limit $${params.length + 1} offset $${params.length + 2}`,
        [...params, pageSize, (page - 1) * pageSize]
      ),
      pool.query("select distinct action from audit_log order by action"),
    ]);
    return {
      rows: res.rows.map((r) => ({
        id: Number(r.id),
        actorEmail: r.actor_email,
        actorRole: r.actor_role,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        meta: r.meta,
        ip: r.ip,
        createdAt: new Date(r.created_at).toISOString(),
      })),
      total: res.rows[0] ? Number(res.rows[0].total_count) : 0,
      actions: actions.rows.map((a) => a.action),
    };
  } catch (err) {
    throw storageErrorFromThrown("list_audit", err);
  }
}

export async function exportAudit(q: AuditQuery): Promise<AuditRow[]> {
  const { rows } = await listAudit({ ...q, page: 1, pageSize: 200 });
  return rows;
}
