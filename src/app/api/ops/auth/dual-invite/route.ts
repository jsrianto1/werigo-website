import { getAdmin, canManageDualAccounts } from '@/lib/adminAuth';
import { AppError, choice, currentStaff, db, fail, json, sameOrigin, txt } from '@/ops/lib/server';
import { IDLE_AGE } from '@/ops/lib/auth';
import { isDualId, newDualId, websiteRoleForDualMember } from '@/ops/lib/dual-identity';
import { dualInviteAge, dualInviteHash } from '@/ops/lib/dual-invites';
import { passwordMatches, sessionToken, sha256, usernameValue } from '@/ops/lib/password';
import type {OpsPreparedStatement} from '@/ops/lib/database';

const WINDOW = 15 * 60_000;

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const issuer = await currentStaff();
    const admin = await getAdmin();
    if (!canManageDualAccounts(issuer.role, admin)) throw new AppError('Perlu akses Owner Ops dan Super Admin website.', 403);
    if (admin?.provider === 'workspace' && admin.id !== issuer.id) throw new AppError('Identitas workspace tidak cocok.', 403);
    const now = Date.now();
    if (admin?.provider !== 'workspace' &&
      (!admin?.sessionStartedAt || admin.sessionStartedAt > now || now - admin.sessionStartedAt >= WINDOW)) {
      throw new AppError('Sambungkan ulang login Super Admin website sebelum mengubah akses tim.', 403);
    }
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) throw new AppError('Isian tidak valid.');
    const action = choice(body.action, ['create', 'reissue', 'disable']);
    const password = body.current_password;
    if (typeof password !== 'string' || !password || password.length > 1024) throw new AppError('Masukkan password Ops saat ini.');
    const ops = db();
    const bucket = Math.floor(now / WINDOW);
    const limitKey = await sha256(`dual-invite:${issuer.id}:${bucket}`);
    const limit = await ops.prepare(
      'INSERT INTO auth_limits(id,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=auth_limits.attempts+1 RETURNING attempts'
    ).bind(limitKey, (bucket + 1) * WINDOW).first<{attempts: number}>();
    if (!limit || limit.attempts > 5) throw new AppError('Terlalu banyak percobaan. Coba lagi dalam 15 menit.', 429);
    const ownAccount = await ops.prepare('SELECT password_hash FROM auth_accounts WHERE staff_id=?')
      .bind(issuer.id).first<{password_hash: string}>();
    if (!ownAccount || !await passwordMatches(password, ownAccount.password_hash)) throw new AppError('Password Ops tidak cocok.', 401);
    await ops.prepare('DELETE FROM auth_limits WHERE id=?').bind(limitKey).run();

    const target = body.id;
    let id: string, name: string, username: string, role: string;
    if (action === 'create') {
      id = newDualId();
      name = txt(body.name, 100, true);
      try { username = usernameValue(body.username); } catch (error) { throw new AppError((error as Error).message); }
      role = choice(body.role, ['owner', 'manager', 'finance', 'ops']);
    } else {
      if (!isDualId(target) || target === issuer.id) throw new AppError('Akun ini tidak dapat diubah di sini.', 403);
      id = target;
      const existing = await ops.prepare(
        'SELECT s.id,s.email,s.name,s.role,a.username FROM staff s JOIN auth_accounts a ON a.staff_id=s.id WHERE s.id=?'
      ).bind(id).first<{id: string; email: string; name: string; role: string; username: string}>();
      if (!existing || !websiteRoleForDualMember(existing)) throw new AppError('Akun tidak ditemukan.', 404);
      ({name, role, username} = existing);
    }

    // Serialize with other Ops mutations and recheck the issuer's valid Ops
    // session and credential after password verification.
    const guard = `EXISTS(SELECT 1 FROM auth_sessions t JOIN auth_accounts a ON a.staff_id=t.staff_id JOIN staff s ON s.id=t.staff_id
      WHERE t.id=? AND t.staff_id=? AND t.expires_at>? AND t.last_seen_at>? AND a.password_hash=? AND s.enabled=1 AND s.role='owner')`;
    const writeAt = Date.now();
    const guardValues = [issuer.session_id, issuer.id, writeAt, writeAt - IDLE_AGE, ownAccount.password_hash];
    const statements: OpsPreparedStatement[] = [];
    if (action === 'create') {
      statements.push(ops.prepare(`INSERT INTO staff(id,email,name,role,enabled,created_at) SELECT ?,?,?,?,1,? WHERE ${guard}`)
        .bind(id, 'user:' + id, name, role, writeAt, ...guardValues));
      statements.push(ops.prepare(`INSERT INTO auth_accounts(staff_id,username,password_hash,updated_at) SELECT ?,?,'!pending',? WHERE ${guard}`)
        .bind(id, username, writeAt, ...guardValues));
    } else {
      statements.push(ops.prepare(`UPDATE staff SET enabled=? WHERE id=? AND ${guard}`)
        .bind(action === 'disable' ? 0 : 1, id, ...guardValues));
      statements.push(ops.prepare(`UPDATE auth_accounts SET password_hash='!pending',updated_at=? WHERE staff_id=? AND ${guard}`)
        .bind(writeAt, id, ...guardValues));
      statements.push(ops.prepare(`DELETE FROM auth_sessions WHERE staff_id=? AND ${guard}`).bind(id, ...guardValues));
      statements.push(ops.prepare(`UPDATE auth_invites SET used_at=? WHERE staff_id=? AND used_at IS NULL AND ${guard}`)
        .bind(writeAt, id, ...guardValues));
    }
    const token = action === 'disable' ? null : sessionToken();
    const expires = writeAt + dualInviteAge;
    if (token) statements.push(ops.prepare(`INSERT INTO auth_invites(id,staff_id,created_at,expires_at) SELECT ?,?,?,? WHERE ${guard}`)
      .bind(await dualInviteHash(token), id, writeAt, expires, ...guardValues));
    const detail = JSON.stringify({ username, ops_role: role, website_role: role === 'owner' ? 'super_admin' : 'admin' });
    statements.push(
      ops.prepare(`INSERT INTO audit(id,action,entity_id,detail,actor,created_at) SELECT ?,?,?,?,?,? WHERE ${guard}`)
        .bind(crypto.randomUUID(), 'dual.' + action, id, detail, issuer.email, writeAt, ...guardValues),
      ops.prepare(`INSERT INTO public.audit_log(actor_id,actor_email,actor_role,action,entity_type,entity_id,meta) SELECT ?,?,'super_admin',?,'workspace_staff',?,?::jsonb WHERE ${guard}`)
        .bind(admin!.id, admin!.email, 'workspace.staff.' + action, id, detail, ...guardValues)
    );
    const result = await ops.batch(statements);
    if (!result[0].meta.changes) throw new AppError('Sesi berubah. Masuk ulang sebelum melanjutkan.', 403);
    const base = process.env.NEXT_PUBLIC_SITE_URL || (process.env.NODE_ENV === 'production' ? 'https://werigo.co' : req.url);
    return json({ok: true, ...(token ? {invitation: {
      activation_url: new URL('/ops/dual-activate#token=' + token, base).toString(), username, expires_at: expires,
    }} : {})});
  } catch (error) { return fail(error); }
}
