import {db,json,fail,AppError,sameOrigin,auditStatement,uid} from '@/ops/lib/server';
import {usernameValue,passwordValue,passwordMatches,DUMMY_HASH,sha256,sessionToken} from '@/ops/lib/password';
import {authCookie,SESSION_COOKIE,SIGNED_OUT_COOKIE,SESSION_AGE} from '@/ops/lib/auth';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{
 sameOrigin(req);const d=await req.json() as Record<string,unknown>;let username,password;try{username=usernameValue(d.username);password=passwordValue(d.password);}catch(e){throw new AppError((e as Error).message);}
 const now=Date.now(),bucket=Math.floor(now/900000),expiry=(bucket+1)*900000,ip=req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
 const keys=await Promise.all(['user:'+username,'ip:'+ip].map(s=>sha256(s+':'+bucket)));
 await db().prepare('DELETE FROM auth_limits WHERE expires_at<?').bind(now-86400000).run();
 await db().batch(keys.map(id=>db().prepare('INSERT INTO auth_limits(id,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=auth_limits.attempts+1').bind(id,expiry)));
 const limits=await Promise.all(keys.map(id=>db().prepare('SELECT attempts FROM auth_limits WHERE id=?').bind(id).first<{attempts:number}>()));
 if(Number(limits[0]?.attempts)>5||Number(limits[1]?.attempts)>30){await db().batch([auditStatement('auth.login_limited',username,{username},'Unknown user')]);return json({error:'Too many attempts. Try again in 15 minutes.'},429);}
 const account=await db().prepare('SELECT s.*,a.password_hash,a.username FROM auth_accounts a JOIN staff s ON s.id=a.staff_id WHERE a.username=?').bind(username).first<any>();
 const matches=await passwordMatches(password,account?.password_hash?.startsWith('pbkdf2-sha256$')?account.password_hash:DUMMY_HASH);
 if(!account||!account.enabled||!matches){await db().batch([auditStatement('auth.login_failed',username,{username},account?.email||'Unknown user')]);return json({error:'Username or password is incorrect.'},401);}
 const token=sessionToken(),hash=await sha256(token);
 // Recheck under the write lock: a password reset or disabling this account
 // between verification and the insert must not mint a fresh session.
 const results=await db().batch([
  db().prepare('INSERT INTO auth_sessions(id,staff_id,created_at,last_seen_at,expires_at) SELECT ?,s.id,?,?,? FROM staff s JOIN auth_accounts a ON a.staff_id=s.id WHERE s.id=? AND s.enabled=1 AND a.username=? AND a.password_hash=?').bind(hash,now,now,now+SESSION_AGE,account.id,username,account.password_hash),
  db().prepare("INSERT INTO audit(id,action,entity_id,detail,actor,created_at) SELECT ?,'auth.login',?,?,?,? WHERE changes()>0").bind(uid(),account.id,JSON.stringify({username}),account.email,now),
  db().prepare('DELETE FROM auth_sessions WHERE expires_at<?').bind(now),
  db().prepare('DELETE FROM auth_limits WHERE id=? AND EXISTS (SELECT 1 FROM auth_sessions WHERE id=?)').bind(keys[0],hash),
 ]);
 if(!results[0].meta.changes)return json({error:'Username or password is incorrect.'},401);
 const response=json({ok:true});response.headers.append('Set-Cookie',authCookie(SESSION_COOKIE,token,req,SESSION_AGE/1000));response.headers.append('Set-Cookie',authCookie(SIGNED_OUT_COOKIE,'',req,0));return response;
 }catch(e){return fail(e);}}
