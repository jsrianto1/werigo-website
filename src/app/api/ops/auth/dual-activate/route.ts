import { AppError, db, fail, json, sameOrigin } from '@/ops/lib/server';
import { validDualPassword, websiteRoleForDualMember } from '@/ops/lib/dual-identity';
import { dualInviteError, dualInviteHash } from '@/ops/lib/dual-invites';
import { passwordHash } from '@/ops/lib/password';

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token)) throw new AppError(dualInviteError, 410);
    const ops = db();
    const id = await dualInviteHash(body.token);
    const row = await ops.prepare(
      "SELECT s.id,s.email,s.role,a.username,i.expires_at FROM auth_invites i JOIN staff s ON s.id=i.staff_id JOIN auth_accounts a ON a.staff_id=s.id WHERE i.id=? AND i.used_at IS NULL AND i.expires_at>? AND s.enabled=1 AND a.password_hash='!pending'"
    ).bind(id, Date.now()).first<{id: string; email: string; role: string; username: string; expires_at: number}>();
    const websiteRole = row && websiteRoleForDualMember(row);
    if (!row || !websiteRole) throw new AppError(dualInviteError, 410);
    if (body.action === 'inspect') return json({username: row.username, role: row.role, website_role: websiteRole, expires_at: row.expires_at});
    if (body.action !== 'activate') throw new AppError('Isian aktivasi tidak valid.');
    if (!validDualPassword(body.password)) throw new AppError('Buat password antara 16 dan 128 karakter.');
    if (body.password !== body.confirm_password) throw new AppError('Kedua password tidak sama.');
    const hash = await passwordHash(body.password);
    const now = Date.now(), claim = crypto.randomUUID();
    const guard = 'EXISTS(SELECT 1 FROM auth_invites WHERE id=? AND claim=?)';
    const result = await ops.batch([
      ops.prepare(`UPDATE auth_invites SET used_at=?,claim=? WHERE id=? AND staff_id=? AND used_at IS NULL AND expires_at>? AND
        EXISTS (SELECT 1 FROM staff s JOIN auth_accounts a ON a.staff_id=s.id WHERE s.id=auth_invites.staff_id AND s.enabled=1 AND s.email=? AND s.role=? AND a.username=? AND a.password_hash='!pending')`)
        .bind(now, claim, id, row.id, now, row.email, row.role, row.username),
      ops.prepare(`UPDATE auth_accounts SET password_hash=?,updated_at=? WHERE staff_id=? AND ${guard}`).bind(hash, now, row.id, id, claim),
      ops.prepare(`DELETE FROM auth_sessions WHERE staff_id=? AND ${guard}`).bind(row.id, id, claim),
      ops.prepare(`INSERT INTO audit(id,action,entity_id,detail,actor,created_at) SELECT ?,'dual.activated',?,?,?,? WHERE ${guard}`)
        .bind(crypto.randomUUID(), row.id, JSON.stringify({username: row.username}), row.email, now, id, claim),
    ]);
    if (!result[0].meta.changes) throw new AppError(dualInviteError, 410);
    return json({ok: true, username: row.username});
  } catch (error) { return fail(error); }
}
