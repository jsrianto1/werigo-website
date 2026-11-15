import {db,currentStaff,sameOrigin,json,fail,AppError,auditStatement} from '@/ops/lib/server';
import {usernameValue,passwordValue,passwordHash,passwordMatches} from '@/ops/lib/password';
export async function POST(req:Request){try{sameOrigin(req);const m=await currentStaff(),d=await req.json() as any;let username,password;try{username=usernameValue(d.username);password=passwordValue(d.password);}catch(e){throw new AppError((e as Error).message);}
 const old=await db().prepare('SELECT * FROM auth_accounts WHERE staff_id=?').bind(m.id).first<any>();
 if(old&&m.auth_type!=='chatgpt'&&!await passwordMatches(String(d.current_password||''),old.password_hash))throw new AppError('Current password is incorrect.',401);
 const hash=await passwordHash(password),now=Date.now();await db().batch([db().prepare('INSERT INTO auth_accounts(staff_id,username,password_hash,updated_at) VALUES(?,?,?,?) ON CONFLICT(staff_id) DO UPDATE SET username=excluded.username,password_hash=excluded.password_hash,updated_at=excluded.updated_at').bind(m.id,username,hash,now),db().prepare('DELETE FROM auth_sessions WHERE staff_id=?').bind(m.id),auditStatement('auth.password_changed',m.id,{username},m.email)]);
 return json({ok:true,sign_in_again:m.auth_type!=='chatgpt'});
 }catch(e){return fail(e);}}
