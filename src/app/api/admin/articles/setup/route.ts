import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { contentAdmin, sameOrigin } from "@/lib/cmsAccess";
import { isResponse } from "@/lib/adminApi";
import { withTransaction } from "@/lib/db";
import { ARTICLES_SQL } from "@/lib/articleSchema";
export const runtime = "nodejs";
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ok:false,error:"forbidden"},{status:403});
  const admin = await contentAdmin(true); if (isResponse(admin)) return admin;
  try {
    await withTransaction(async client => {
      await client.query("set local lock_timeout='5s'"); await client.query("set local statement_timeout='20s'");
      await client.query("select pg_advisory_xact_lock(76016)");
      const checksum=createHash("sha256").update(ARTICLES_SQL).digest("hex").slice(0,16);
      const applied=await client.query("select checksum from schema_migrations where name='0016_articles.sql'");
      if(applied.rows[0]) {if(applied.rows[0].checksum!==checksum)throw new Error("Migration checksum mismatch");return;}
      await client.query(ARTICLES_SQL);
      await client.query("insert into schema_migrations(name,checksum) values('0016_articles.sql',$1)",[checksum]);
      await client.query("insert into audit_log(actor_id,actor_email,actor_role,action,entity_type) values($1,$2,$3,'articles.activate','article')",[admin.id,admin.email,admin.role]);
    });
    return NextResponse.json({ok:true});
  } catch {return NextResponse.json({ok:false,error:"setup_failed",message:"Article storage could not be activated. No partial changes were committed."},{status:503});}
}
