import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/adminAuth";
import { getPool, withTransaction } from "@/lib/db";
import { rideClubReady, rideSummary } from "@/lib/rideClub";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
  if (!(await rideClubReady())) return NextResponse.json({ok:true,ready:false,members:[]});
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (userId) return NextResponse.json({ok:true,ready:true,summary:await rideSummary(userId)});
  const search = (url.searchParams.get("search")??"").slice(0,150);
  const members = await getPool().query(`select u.id,u.name,u.email,m.joined_at,
    ride_balance(u.id) as balance,ride_tier_for(u.id) as tier,ride_spend(u.id)::text as spend
    from ride_members m join "user" u on u.id=m.user_id
    where u.name ilike $1 or u.email ilike $1 order by m.joined_at desc,u.id limit 50`,[`%${search.replace(/[\\%_]/g,"\\$&")}%`]);
  return NextResponse.json({ok:true,ready:true,members:members.rows});
}
const correction = z.object({userId:z.string().min(1).max(200),points:z.number().int().min(-10000).max(10000).refine(v=>v!==0),reason:z.string().trim().min(5).max(300),requestId:z.uuid()});
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(process.env.NEXT_PUBLIC_SITE_URL||req.url).origin) return NextResponse.json({ok:false,error:"forbidden"},{status:403});
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
  if (admin.role!=="super_admin") return NextResponse.json({ok:false,error:"forbidden"},{status:403});
  const parsed=correction.safeParse(await req.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({ok:false,error:"validation"},{status:422});
  if (!(await rideClubReady())) return NextResponse.json({ok:false,error:"not_ready"},{status:503});
  const d=parsed.data;
  try {
    await withTransaction(async client=>{
      const adjusted=await client.query("select ride_adjust($1,$2,$3,$4,$5::uuid) as id",[d.userId,d.points,d.reason,admin.email,d.requestId]);
      await client.query(`insert into audit_log(actor_id,actor_email,actor_role,action,entity_type,entity_id,meta)
        select $1,$2,$3,'membership.adjust','member',$4,$5::jsonb
        where not exists(select 1 from audit_log where action='membership.adjust' and meta->>'requestId'=$6)`,
        [admin.id,admin.email,admin.role,d.userId,JSON.stringify({...d,adjustmentId:adjusted.rows[0].id}),d.requestId]);
    });
    return NextResponse.json({ok:true});
  } catch { return NextResponse.json({ok:false,error:"adjustment_failed",message:"Check the member and available balance, then try again."},{status:409}); }
}
