import {withTransaction} from '@/lib/db';
import {codexAccessOwner, readApprovalAge} from '@/lib/werigo-read-admin';
import {deviceIdPattern,deviceTableSql,readDeviceKey,readKeyTtlDays} from '@/lib/werigo-read';
import {sameOrigin, AppError,json,fail,txt} from '@/ops/lib/server';
import {boundedBody} from '@/lib/cmsAccess';

export const runtime='nodejs';
export async function POST(req:Request) {
  try {
    sameOrigin(req);
    const admin=await codexAccessOwner();
    if(!admin) throw new AppError('Perlu Owner Ops asli dan Super Admin website.',403);
    const now=Date.now();
    if(!admin.sessionStartedAt || admin.sessionStartedAt>now || now-admin.sessionStartedAt>=readApprovalAge) {
      throw new AppError('Sambungkan ulang Super Admin website sebelum mengubah akses Codex.',403);
    }
    let body:Record<string,unknown>;
    try { body=JSON.parse(new TextDecoder().decode(await boundedBody(req,2048))); }
    catch { throw new AppError('Isian tidak valid.'); }
    if(!body || typeof body!=='object' || !['authorize','revoke'].includes(String(body.action))) throw new AppError('Aksi tidak valid.');
    const activate=body.action==='authorize';
    let deviceId:string, publicKey:string|undefined, label:string|undefined;
    if(activate) {
      publicKey=txt(body.public_key,43,true);
      label=txt(body.label,48,true);
      try { deviceId=readDeviceKey(publicKey).id; }
      catch { throw new AppError('Public key perangkat tidak valid.'); }
    } else {
      deviceId=txt(body.id,32,true);
      if(!deviceIdPattern.test(deviceId)) throw new AppError('ID perangkat tidak valid.');
    }
    const expires=new Date(now+readKeyTtlDays*86_400_000);
    await withTransaction(async client=>{
      await client.query('SELECT pg_advisory_xact_lock(76194)');
      if(activate) {
        if(!(await client.query("SELECT to_regclass('ops.codex_read_devices') AS table_name")).rows[0]?.table_name) {
          await client.query(deviceTableSql);
        }
        const active=await client.query<{count:number}>('SELECT count(*)::int AS count FROM ops.codex_read_devices WHERE id<>$1 AND revoked_at IS NULL AND expires_at>now()',[deviceId]);
        if((active.rows[0]?.count??0)>=10)throw new AppError('Cabut salah satu perangkat aktif dulu.',409);
        await client.query(`INSERT INTO ops.codex_read_devices(id,public_key,label,created_by,expires_at)
          VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET label=excluded.label,created_by=excluded.created_by,
          created_at=now(),expires_at=excluded.expires_at,revoked_at=NULL`,[deviceId,publicKey,label,admin.id,expires]);
      } else {
        const result=await client.query('UPDATE ops.codex_read_devices SET revoked_at=now() WHERE id=$1 AND revoked_at IS NULL',[deviceId]);
        if(!result.rowCount) throw new AppError('Perangkat aktif tidak ditemukan.',404);
      }
      await client.query('INSERT INTO public.audit_log(actor_id,actor_email,actor_role,action,entity_type,entity_id) VALUES($1,$2,$3,$4,$5,$6)',
        [admin.id,admin.email,admin.role,activate?'codex_read.authorized':'codex_read.revoked','codex_read_device',deviceId]);
    });
    return json({ok:true,id:deviceId,expires_at:activate?expires:null});
  } catch (e) { return fail(e); }
}
