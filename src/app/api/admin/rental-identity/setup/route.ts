import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getAdmin } from "@/lib/adminAuth";
import { withTransaction } from "@/lib/db";
import { RENTAL_IDENTITY_SQL } from "@/lib/rentalIdentitySchema";
export const runtime="nodejs";
export async function POST(req:Request){
  const expected=new URL(process.env.NEXT_PUBLIC_SITE_URL||req.url).origin;
  if(req.headers.get("origin")!==expected)return NextResponse.json({ok:false,error:"forbidden"},{status:403});
  const admin=await getAdmin();
  if(!admin)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
  if(admin.role!=="super_admin")return NextResponse.json({ok:false,error:"forbidden"},{status:403});
  try{
    await withTransaction(async client=>{
      await client.query("set local lock_timeout='5s'");
      await client.query("set local statement_timeout='20s'");
      await client.query("select pg_advisory_xact_lock(76012)");
      const checksum=createHash("sha256").update(RENTAL_IDENTITY_SQL).digest("hex").slice(0,16);
      const applied=await client.query("select checksum from schema_migrations where name='0012_rental_identity.sql'");
      if(applied.rows[0]){
        if(applied.rows[0].checksum!==checksum)throw new Error("Migration checksum mismatch");
        return;
      }
      const prerequisites=await client.query("select to_regclass('public.customer_identity') is not null as ready");
      if(!prerequisites.rows[0].ready)throw new Error("Apply migration 0007 first");
      await client.query(RENTAL_IDENTITY_SQL);
      await client.query("insert into schema_migrations(name,checksum) values('0012_rental_identity.sql',$1)",[checksum]);
      await client.query(`insert into audit_log(actor_id,actor_email,actor_role,action,entity_type)
        values($1,$2,$3,'rental_identity.activate','settings')`,[admin.id,admin.email,admin.role]);
    });
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({ok:false,error:"setup_failed",message:"Database setup failed. No partial migration was committed."},{status:503});}
}
