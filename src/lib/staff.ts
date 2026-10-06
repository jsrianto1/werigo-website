import "server-only";
import { randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { getPool, withTransaction } from "@/lib/db";
import { storageErrorFromThrown } from "@/lib/storageErrors";
import { STAFF_ROLES, type Role } from "@/lib/auth";

/**
 * Staff accounts, managed by a super admin from the dashboard
 * (replaces scripts/create-admin.mjs for day-to-day use). A new staff
 * member gets a temporary password chosen by the super admin and must
 * set their own at first sign-in (user.mustChangePassword).
 */

export interface StaffRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  sessions: number;
}

const newId = () => randomBytes(24).toString("base64url").slice(0, 32);

function toRow(r: Record<string, unknown>): StaffRow {
  return {
    id: r.id as string,
    name: r.name as string,
    email: r.email as string,
    role: r.role as Role,
    active: !r.banned,
    mustChangePassword: Boolean(r.mustChangePassword),
    createdAt: new Date(r.createdAt as string).toISOString(),
    lastLoginAt: r.lastLoginAt ? new Date(r.lastLoginAt as string).toISOString() : null,
    sessions: Number(r.sessions ?? 0),
  };
}

const STAFF_SELECT = `
  select u.id, u.name, u.email, u.role, u.banned, u."mustChangePassword", u."createdAt", u."lastLoginAt",
         (select count(*)::int from session s where s."userId" = u.id and s."expiresAt" > now()) as sessions
  from "user" u where u.role in ('admin', 'super_admin')`;

export async function listStaff(): Promise<StaffRow[]> {
  try {
    const res = await getPool().query(`${STAFF_SELECT} order by u.role desc, u.name`);
    return res.rows.map(toRow);
  } catch (err) {
    throw storageErrorFromThrown("list_staff", err);
  }
}

export class StaffError extends Error {
  readonly reason: "email_taken" | "not_found" | "self" | "last_super_admin" | "not_staff";
  constructor(reason: StaffError["reason"]) {
    super(reason);
    this.reason = reason;
  }
}

export async function createStaff(input: { name: string; email: string; role: Role; tempPassword: string }): Promise<StaffRow> {
  if (!STAFF_ROLES.includes(input.role)) throw new StaffError("not_staff");
  const email = input.email.trim().toLowerCase();
  try {
    const hash = await hashPassword(input.tempPassword);
    return await withTransaction(async (client) => {
      const existing = await client.query('select id, role from "user" where lower(email) = $1', [email]);
      if (existing.rows[0]) throw new StaffError("email_taken");
      const id = newId();
      await client.query(
        `insert into "user" (id, name, email, "emailVerified", role, "mustChangePassword", "createdAt", "updatedAt")
         values ($1, $2, $3, true, $4, true, now(), now())`,
        [id, input.name.trim(), email, input.role]
      );
      await client.query(
        `insert into account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         values ($1, $2, 'credential', $2, $3, now(), now())`,
        [newId(), id, hash]
      );
      const row = await client.query(`${STAFF_SELECT} and u.id = $1`, [id]);
      return toRow(row.rows[0]);
    });
  } catch (err) {
    if (err instanceof StaffError) throw err;
    throw storageErrorFromThrown("create_staff", err);
  }
}

async function assertNotLastSuperAdmin(client: { query: (q: string, p?: unknown[]) => Promise<{ rows: { n: number }[] }> }, id: string) {
  const res = await client.query(
    `select count(*)::int as n from "user" where role = 'super_admin' and coalesce(banned, false) = false and id <> $1`,
    [id]
  );
  if ((res.rows[0]?.n ?? 0) === 0) throw new StaffError("last_super_admin");
}

export async function updateStaff(
  id: string,
  actorId: string,
  change: { role?: Role; active?: boolean; tempPassword?: string; revokeSessions?: boolean }
): Promise<StaffRow> {
  try {
    return await withTransaction(async (client) => {
      const u = await client.query('select id, role, banned from "user" where id = $1 for update', [id]);
      const row = u.rows[0];
      if (!row) throw new StaffError("not_found");
      if (!STAFF_ROLES.includes(row.role)) throw new StaffError("not_staff");
      const demotingOrDisabling = (change.role && change.role !== "super_admin") || change.active === false;
      if (id === actorId && demotingOrDisabling) throw new StaffError("self");
      if (row.role === "super_admin" && demotingOrDisabling) await assertNotLastSuperAdmin(client, id);

      if (change.role) await client.query('update "user" set role = $2 where id = $1', [id, change.role]);
      if (change.active !== undefined) {
        await client.query(
          'update "user" set banned = $2, "banReason" = $3, "banExpires" = null where id = $1',
          [id, !change.active, change.active ? null : "Deactivated by a super admin"]
        );
      }
      if (change.tempPassword) {
        const hash = await hashPassword(change.tempPassword);
        const upd = await client.query(
          `update account set password = $2, "updatedAt" = now() where "userId" = $1 and "providerId" = 'credential' returning id`,
          [id, hash]
        );
        if (upd.rowCount === 0) {
          await client.query(
            `insert into account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
             values ($1, $2, 'credential', $2, $3, now(), now())`,
            [newId(), id, hash]
          );
        }
        await client.query('update "user" set "mustChangePassword" = true where id = $1', [id]);
      }
      if (change.revokeSessions || change.active === false || change.tempPassword || change.role) {
        await client.query('delete from session where "userId" = $1', [id]);
      }
      const out = await client.query(`${STAFF_SELECT} and u.id = $1`, [id]);
      return toRow(out.rows[0]);
    });
  } catch (err) {
    if (err instanceof StaffError) throw err;
    throw storageErrorFromThrown("update_staff", err);
  }
}

/** Called after a staff member sets their own password. */
export async function clearMustChangePassword(id: string): Promise<void> {
  await getPool().query('update "user" set "mustChangePassword" = false where id = $1', [id]);
}

export interface SessionRow {
  id: string;
  createdAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  current: boolean;
}

export async function listOwnSessions(userId: string, currentToken: string | null): Promise<SessionRow[]> {
  const res = await getPool().query(
    'select id, token, "createdAt", "expiresAt", "ipAddress", "userAgent" from session where "userId" = $1 and "expiresAt" > now() order by "createdAt" desc',
    [userId]
  );
  return res.rows.map((r) => ({
    id: r.id,
    createdAt: new Date(r.createdAt).toISOString(),
    expiresAt: new Date(r.expiresAt).toISOString(),
    ipAddress: r.ipAddress,
    userAgent: r.userAgent,
    current: currentToken !== null && r.token === currentToken,
  }));
}

export async function revokeOtherSessions(userId: string, currentToken: string | null): Promise<number> {
  const res = await getPool().query('delete from session where "userId" = $1 and ($2::text is null or token <> $2)', [userId, currentToken]);
  return res.rowCount ?? 0;
}
