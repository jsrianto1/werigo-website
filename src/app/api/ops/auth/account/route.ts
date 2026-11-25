import {db,currentStaff,sameOrigin,json,fail,AppError,uid} from '@/ops/lib/server';
import {usernameValue,passwordValue,passwordHash,passwordMatches} from '@/ops/lib/password';
import {isDualId,validDualPassword} from '@/ops/lib/dual-identity';
import {IDLE_AGE} from '@/ops/lib/auth';
export async function POST(req:Request){try{sameOrigin(req);const m=await currentStaff(),d=await req.json() as any;let username,password;try{username=usernameValue(d.username);password=passwordValue(d.password);}catch(e){throw new AppError((e as Error).message);}
 if(isDualId(m.id)&&!validDualPassword(password))throw new AppError('Use a password between 16 and 128 characters.');
 const old=await db().prepare('SELECT * FROM auth_accounts WHERE staff_id=?').bind(m.id).first<any>();
 if(!old||!await passwordMatches(String(d.current_password||''),old.password_hash))throw new AppError('Current password is incorrect.',401);
 const hash=await passwordHash(password),now=Date.now();
 const result=await db().batch([
  db().prepare('UPDATE auth_accounts SET username=?,password_hash=?,updated_at=? WHERE staff_id=? AND password_hash=? AND EXISTS(SELECT 1 FROM auth_sessions t JOIN staff s ON s.id=t.staff_id WHERE t.id=? AND t.staff_id=? AND t.expires_at>? AND t.last_seen_at>? AND s.enabled=1)').bind(username,hash,now,m.id,old.password_hash,m.session_id,m.id,now,now-IDLE_AGE),
  db().prepare("INSERT INTO audit(id,action,entity_id,detail,actor,created_at) SELECT ?,'auth.password_changed',?,?,?,? WHERE changes()>0").bind(uid(),m.id,JSON.stringify({username}),m.email,now),
  db().prepare('DELETE FROM auth_sessions WHERE staff_id=? AND changes()>0').bind(m.id),
 ]);
 if(!result[0].meta.changes)throw new AppError('Session changed. Sign in again.',401);
 return json({ok:true,sign_in_again:true});
 }catch(e){return fail(e);}}
