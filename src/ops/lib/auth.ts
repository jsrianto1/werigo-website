import type {OpsDatabase} from '@/ops/lib/database';
import {headers} from 'next/headers';

import {sha256} from './password';
import type {Row} from './domain';
export const SESSION_COOKIE='werigo_ops_session',SIGNED_OUT_COOKIE='werigo_ops_signed_out';
export const SESSION_AGE=7*86400000,IDLE_AGE=86400000;
export function cookieValue(header:string,name:string){return header.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1)||'';}
export function authCookie(name:string,value:string,req:Request,maxAge:number){const secure=process.env.NODE_ENV==='production'||new URL(req.url).protocol==='https:'?'; Secure':'';return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;}
export async function resolveMember(d:OpsDatabase):Promise<Row|null>{
 const h=await headers(),cookie=h.get('cookie')||'',token=cookieValue(cookie,SESSION_COOKIE),now=Date.now();
 if(token){if(!/^[a-f0-9]{64}$/.test(token))return null;const hash=await sha256(token);const row=await d.prepare("SELECT s.*,a.username,t.id AS session_id FROM auth_sessions t JOIN staff s ON s.id=t.staff_id JOIN auth_accounts a ON a.staff_id=s.id WHERE t.id=? AND t.expires_at>? AND t.last_seen_at>? AND s.enabled=1 AND a.password_hash<>'!pending'").bind(hash,now,now-IDLE_AGE).first<Row>();if(!row)return null;await d.prepare('UPDATE auth_sessions SET last_seen_at=? WHERE id=? AND last_seen_at<?').bind(now,hash,now-300000).run();return {...row,auth_type:'password'};}
 if(cookieValue(cookie,SIGNED_OUT_COOKIE)==='1')return null;
 return null;
}
