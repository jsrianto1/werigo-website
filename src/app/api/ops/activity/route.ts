import {db,currentStaff,permitted,sameOrigin,txt,json,fail,AppError,auditStatement} from '@/ops/lib/server';
import {parseWita,DAY,dateWita} from '@/ops/lib/domain';
export const dynamic='force-dynamic';
const pages=['dashboard','bookings','fleet','handovers','customers','payments','reports','notes','feedback','pricing','settings','activity','account','sales','rentals','reminders'];
export async function POST(req:Request){try{sameOrigin(req);const m=await currentStaff(),d=await req.json() as any,page=txt(d.page,30,true);if(!pages.includes(page))throw new AppError('Unknown page.');if(['settings','activity'].includes(page))permitted(m,['owner']);if(['payments','reports'].includes(page))permitted(m,['owner','manager','finance']);
 // Page telemetry is authenticated and bounded. Data changes/login events are logged by server handlers.
 await db().prepare("INSERT INTO audit(id,action,entity_id,detail,actor,created_at) SELECT ?,'page.viewed',?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM audit WHERE actor=? AND action='page.viewed' AND entity_id=? AND created_at>?)").bind(crypto.randomUUID(),page,JSON.stringify({page}),m.email,Date.now(),m.email,page,Date.now()-10000).run();return json({ok:true});}catch(e){return fail(e);}}
export async function GET(req:Request){try{const m=await currentStaff();permitted(m,['owner']);const p=new URL(req.url).searchParams,actor=txt(p.get('actor'),200),action=txt(p.get('action'),80),where:string[]=[],args:any[]=[];
 const date=(s:string)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw new AppError('Invalid date.');const n=parseWita(s+'T00:00');if(!Number.isFinite(n)||dateWita(n)!==s)throw new AppError('Invalid date.');return n;};
 if(actor){where.push('actor=?');args.push(actor);}if(action){where.push('action=?');args.push(action);}if(p.get('from')){where.push('created_at>=?');args.push(date(p.get('from')!));}if(p.get('to')){where.push('created_at<?');args.push(date(p.get('to')!)+DAY);}const base=where.length?' WHERE '+where.join(' AND '):'';
 const summary=await db().prepare('SELECT COUNT(*) AS total,COUNT(DISTINCT actor) AS users,MAX(created_at) AS latest FROM audit'+base).bind(...args).first();
 const cursor=p.get('cursor');if(cursor){let c;try{c=JSON.parse(atob(cursor));}catch{throw new AppError('Invalid cursor.');}if(!Number.isSafeInteger(c.at)||typeof c.id!=='string'||c.id.length>80)throw new AppError('Invalid cursor.');where.push('(created_at<? OR (created_at=? AND id<?))');args.push(c.at,c.at,c.id);}
 const rows=(await db().prepare('SELECT id,action,entity_id,detail,actor,created_at FROM audit'+(where.length?' WHERE '+where.join(' AND '):'')+' ORDER BY created_at DESC,id DESC LIMIT 51').bind(...args).all()).results as any[];const more=rows.length>50,events=rows.slice(0,50),last=events.at(-1);
 const actors=(await db().prepare('SELECT DISTINCT a.actor,s.name,u.username FROM audit a LEFT JOIN staff s ON s.email=a.actor LEFT JOIN auth_accounts u ON u.staff_id=s.id ORDER BY a.actor LIMIT 500').all()).results;
 const actions=(await db().prepare('SELECT DISTINCT action FROM audit ORDER BY action LIMIT 100').all()).results;
 return json({events,summary,actors,actions,next_cursor:more&&last?btoa(JSON.stringify({at:last.created_at,id:last.id})):null});
 }catch(e){return fail(e);}}
