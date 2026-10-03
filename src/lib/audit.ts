import "server-only";
import { getPool, isDatabaseConfigured } from "@/lib/db";
import type { AdminIdentity } from "@/lib/adminAuth";

/**
 * Append-only audit trail of staff actions (and security-relevant
 * system events). Writing never throws: an audit failure is logged
 * but must not break the action it describes.
 */
export interface AuditEntry {
  actor?: AdminIdentity | null;
  action: string;
  entityType?: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
  ip?: string | null;
}

export async function logAudit(e: AuditEntry): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await getPool().query(
      `insert into audit_log (actor_id, actor_email, actor_role, action, entity_type, entity_id, meta, ip)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        e.actor?.id ?? null,
        e.actor?.email ?? null,
        e.actor?.role ?? null,
        e.action,
        e.entityType ?? null,
        e.entityId ?? null,
        e.meta ? JSON.stringify(e.meta) : null,
        e.ip ?? null,
      ]
    );
  } catch (err) {
    console.error(`[audit] write failed for ${e.action}: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
  }
}

/** Client IP from the proxy headers Hostinger sets. */
export function requestIp(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}
