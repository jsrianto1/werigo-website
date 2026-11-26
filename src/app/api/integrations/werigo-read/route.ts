import {withTransaction} from '@/lib/db';
import {boundedBody} from '@/lib/cmsAccess';
import {readRequest, readSignature, runWerigoRead, verifyReadSignature} from '@/lib/werigo-read';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function json(value:unknown,status=200) {
  return Response.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
export async function POST(req:Request) {
  const now=Date.now();
  const signature=readSignature(req.headers,now);
  if (!signature) return json({ok:false,error:'device_auth_required'},401);
  let body:Uint8Array;
  try { body=await boundedBody(req,4096); } catch { return json({ok:false,error:'invalid_request'},400); }
  try {
    return await withTransaction(async client=>{
      // Enforced by PostgreSQL, not just the MCP tool annotations.
      await client.query('SET TRANSACTION READ ONLY');
      await client.query("SET LOCAL statement_timeout = '2500ms'");
      const result=await client.query<{public_key:string}>(
        'SELECT public_key FROM ops.codex_read_devices WHERE id=$1 AND revoked_at IS NULL AND expires_at>now()',
        [signature.id],
      );
      if(!result.rows[0] || !verifyReadSignature(result.rows[0].public_key,signature,body)) return json({ok:false,error:'device_auth_required'},401);
      let args:unknown;
      try { args=JSON.parse(new TextDecoder().decode(body)); } catch { return json({ok:false,error:'invalid_request'},400); }
      const parsed=readRequest.safeParse(args);
      if (!parsed.success) return json({ok:false,error:'invalid_request'},400);
      if (!(await client.query<{ready:boolean}>('SELECT ready FROM ops.settings WHERE id=1')).rows[0]?.ready) {
        return json({ok:false,error:'data_unavailable'},503);
      }
      const data=await runWerigoRead(client,parsed.data,now);
      return json({ok:true,source:'werigo_live',checked_at:new Date(now).toISOString(),timezone:'Asia/Makassar',...data});
    });
  } catch (e) {
    if((e as {code?:string})?.code==='42P01' && (e as Error).message.includes('codex_read_devices')) return json({ok:false,error:'device_auth_required'},401);
    if(e instanceof RangeError) return json({ok:false,error:'invalid_dates'},400);
    return json({ok:false,error:'data_unavailable'},503);
  }
}
