import { after } from 'next/server';
import { isMailConfigured, sendOpsRecoveryEmail } from '@/lib/mailer';
import { AppError, db, fail, json, sameOrigin, uid } from '@/ops/lib/server';
import { passwordHash, sessionToken, sha256 } from '@/ops/lib/password';

const WINDOW = 15 * 60_000;
const TOKEN_AGE = 30 * 60_000;
const unavailable = 'This recovery link is invalid, expired or already used.';
const tokenHash = (token: string) => sha256('ops-owner-recovery:' + token);

async function withinLimit(key: string, max: number, now: number) {
  const bucket = Math.floor(now / WINDOW);
  const id = await sha256(`ops-owner-recovery:${key}:${bucket}`);
  const result = await db().prepare(
    'INSERT INTO auth_limits(id,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=auth_limits.attempts+1 RETURNING attempts'
  ).bind(id, (bucket + 1) * WINDOW).first<{attempts: number}>();
  return !!result && result.attempts <= max;
}

async function issue(req: Request, input: unknown) {
  const email = typeof input === 'string' ? input.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) {
    throw new AppError('Enter a valid email address.');
  }
  const now = Date.now();
  const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  await db().prepare('DELETE FROM auth_limits WHERE expires_at<?').bind(now - 86_400_000).run();
  if (!(await withinLimit('ip:' + ip.slice(0, 128), 12, now))) {
    throw new AppError('Too many requests. Try again later.', 429);
  }

  // Respond identically for unknown addresses, other roles, and rate-limited
  // accounts. Deliver only to the enabled Owner's stored mailbox.
  after(async () => {
    try {
      if (!isMailConfigured()) return;
      const ops = db();
      const owner = await ops.prepare(
        "SELECT s.id, s.email FROM staff s JOIN auth_accounts a ON a.staff_id=s.id WHERE s.email=? AND s.role='owner' AND s.enabled=1"
      ).bind(email).first<{id: string; email: string}>();
      if (!owner || !(await withinLimit('owner:' + owner.id, 1, now))) return;
      const token = sessionToken();
      const id = await tokenHash(token);
      const result = await ops.prepare(
        "INSERT INTO auth_invites(id,staff_id,created_at,expires_at) SELECT ?,s.id,?,? FROM staff s JOIN auth_accounts a ON a.staff_id=s.id WHERE s.id=? AND s.email=? AND s.role='owner' AND s.enabled=1"
      ).bind(id, now, now + TOKEN_AGE, owner.id, owner.email).run();
      if (!result.meta.changes) return;
      const base = process.env.NEXT_PUBLIC_SITE_URL || (process.env.NODE_ENV === 'production' ? 'https://werigo.co' : req.url);
      const link = new URL('/ops/recover#token=' + token, base).toString();
      try {
        await sendOpsRecoveryEmail(owner.email, link);
      } catch {
        await ops.prepare('DELETE FROM auth_invites WHERE id=? AND used_at IS NULL').bind(id).run();
        throw new Error('Mail delivery failed');
      }
    } catch {
      // Do not log the request, recipient, mail error, or link.
      console.error('[ops-recovery] Could not issue recovery email.');
    }
  });
  return json({ok: true}, 202);
}

async function redeem(body: Record<string, unknown>) {
  if (typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token)) throw new AppError(unavailable, 410);
  const ops = db();
  const id = await tokenHash(body.token);
  const owner = await ops.prepare(
    "SELECT s.id, s.email, a.username FROM auth_invites i JOIN staff s ON s.id=i.staff_id JOIN auth_accounts a ON a.staff_id=s.id WHERE i.id=? AND i.used_at IS NULL AND i.expires_at>? AND i.created_at>=a.updated_at AND s.role='owner' AND s.enabled=1"
  ).bind(id, Date.now()).first<{id: string; email: string; username: string}>();
  if (!owner) throw new AppError(unavailable, 410);
  const password = body.password;
  if (typeof password !== 'string' || password.length > 256 || password.trim().length < 12) {
    throw new AppError('Use a password between 12 and 256 characters.');
  }
  if (password !== body.confirm_password) throw new AppError('Passwords do not match.');
  const hash = await passwordHash(password);
  const now = Date.now(), claim = uid();
  const guard = 'EXISTS (SELECT 1 FROM auth_invites WHERE id=? AND claim=?)';
  const result = await ops.batch([
    ops.prepare("UPDATE auth_invites SET used_at=?,claim=? WHERE id=? AND staff_id=? AND used_at IS NULL AND expires_at>? AND EXISTS (SELECT 1 FROM staff s JOIN auth_accounts a ON a.staff_id=s.id WHERE s.id=auth_invites.staff_id AND s.role='owner' AND s.enabled=1 AND s.email=? AND a.username=? AND auth_invites.created_at>=a.updated_at)")
      .bind(now, claim, id, owner.id, now, owner.email, owner.username),
    ops.prepare(`UPDATE auth_accounts SET password_hash=?,updated_at=? WHERE staff_id=? AND ${guard}`).bind(hash, now, owner.id, id, claim),
    ops.prepare(`DELETE FROM auth_sessions WHERE staff_id=? AND ${guard}`).bind(owner.id, id, claim),
    ops.prepare(`UPDATE auth_invites SET used_at=? WHERE staff_id=? AND used_at IS NULL AND ${guard}`).bind(now, owner.id, id, claim),
    ops.prepare(`INSERT INTO audit(id,action,entity_id,detail,actor,created_at) SELECT ?,'auth.owner_recovered',?,?,?,? WHERE ${guard}`)
      .bind(uid(), owner.id, '{}', owner.email, now, id, claim),
  ]);
  if (!result[0].meta.changes) throw new AppError(unavailable, 410);
  return json({ok: true, username: owner.username});
}

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (body?.action === 'request') return await issue(req, body.email);
    if (body?.action === 'reset') return await redeem(body);
    throw new AppError('Invalid recovery request.');
  } catch (error) {
    return fail(error);
  }
}
