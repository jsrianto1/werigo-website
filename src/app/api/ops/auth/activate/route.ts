import {db,sameOrigin,json,fail,AppError,auditStatement,uid} from '@/ops/lib/server';
import {sha256,passwordValue,passwordHash} from '@/ops/lib/password';
export const dynamic='force-dynamic';
async function invitation(token:unknown){if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new AppError('This activation link is invalid, expired or already used.',410);const hash=await sha256(token),now=Date.now();const row=await db().prepare("SELECT i.id,i.staff_id,i.expires_at,s.name,s.email,a.username FROM auth_invites i JOIN staff s ON s.id=i.staff_id JOIN auth_accounts a ON a.staff_id=s.id WHERE i.id=? AND i.used_at IS NULL AND i.expires_at>? AND s.enabled=1 AND s.role<>'owner'").bind(hash,now).first<any>();if(!row)throw new AppError('This activation link is invalid, expired or already used.',410);return row;}
export async function GET(req:Request){try{const row=await invitation(new URL(req.url).searchParams.get('token'));return json({name:row.name,username:row.username,expires_at:row.expires_at});}catch(e){return fail(e);}}
export async function POST(req:Request){try{sameOrigin(req);const d=await req.json() as any,row=await invitation(d.token);let password;try{password=passwordValue(d.password);}catch(e){throw new AppError((e as Error).message);}if(d.confirm_password!==password)throw new AppError('Passwords do not match.');const hash=await passwordHash(password),claim=uid(),now=Date.now();
 const result=await db().batch([
  db().prepare("UPDATE auth_invites SET used_at=?,claim=? WHERE id=? AND used_at IS NULL AND expires_at>? AND EXISTS(SELECT 1 FROM staff WHERE id=auth_invites.staff_id AND enabled=1 AND role<>'owner')").bind(now,claim,row.id,now),
  db().prepare('UPDATE auth_accounts SET password_hash=?,updated_at=? WHERE staff_id=? AND EXISTS(SELECT 1 FROM auth_invites WHERE id=? AND claim=?)').bind(hash,now,row.staff_id,row.id,claim),
  db().prepare('DELETE FROM auth_sessions WHERE staff_id=? AND EXISTS(SELECT 1 FROM auth_invites WHERE id=? AND claim=?)').bind(row.staff_id,row.id,claim),
  db().prepare("INSERT INTO audit(id,action,entity_id,detail,actor,created_at) SELECT ?,'auth.activated',?,?,?,? WHERE EXISTS(SELECT 1 FROM auth_invites WHERE id=? AND claim=?)").bind(uid(),row.staff_id,JSON.stringify({username:row.username}),row.email,now,row.id,claim)
 ]);if(!result[0].meta.changes)throw new AppError('This activation link is invalid, expired or already used.',410);return json({ok:true,username:row.username});
 }catch(e){return fail(e);}}
