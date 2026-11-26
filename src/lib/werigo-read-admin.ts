import 'server-only';
import {getEmailAdmin, type AdminIdentity} from '@/lib/adminAuth';
import {optionalOpsMember} from '@/ops/lib/workspace-context';
import {isDualId} from '@/ops/lib/dual-identity';
import {getPool} from '@/lib/db';

export const readApprovalAge = 15 * 60_000;
export async function codexAccessOwner():Promise<AdminIdentity|null> {
  const [member,admin]=await Promise.all([optionalOpsMember(),getEmailAdmin()]);
  // Management uses the original Owner with a native website Super Admin
  // session. Paired workspace accounts (including ghost) cannot enroll keys.
  if (!member || member.role!=='owner' || isDualId(member.id) || String(member.username).toLowerCase()==='ghost' ||
      !admin || admin.role!=='super_admin' || admin.impersonated || admin.mustChangePassword) return null;
  return admin;
}
export type ReadDevice = {id:string;label:string;expires_at:Date;revoked_at:Date|null};
export async function listCodexReadDevices() {
  try {
    const {rows}=await getPool().query<ReadDevice>('SELECT id,label,expires_at,revoked_at FROM ops.codex_read_devices ORDER BY (revoked_at IS NULL AND expires_at>now()) DESC,created_at DESC LIMIT 25');
    return rows;
  } catch (e) {
    if ((e as {code?:string})?.code==='42P01') return [];
    throw e;
  }
}
