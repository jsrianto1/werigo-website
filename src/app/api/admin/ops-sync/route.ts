import {NextResponse} from 'next/server';
import {requireAdmin,isResponse} from '@/lib/adminApi';
import {sameOrigin} from '@/lib/cmsAccess';
import {withTransaction,getPool} from '@/lib/db';
import {OPS_SYNC_SQL} from '@/lib/opsInventorySchema';
import {createHash} from 'node:crypto';
import {opsConfigured,drainOpsQueue,opsAvailability,pullOpsRideStatus} from '@/lib/opsInventory';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 const admin=await requireAdmin({superOnly:true});if(isResponse(admin))return admin;
 try{
  const settings=await getPool().query('select enabled,ready from werigo_ops_sync_settings where id=1');
  const queue=await getPool().query('select count(*)::int pending,count(*) filter(where last_error is not null)::int failed from werigo_ops_sync_queue where revision>synced_revision');
  return NextResponse.json({ok:true,configured:opsConfigured(),prepared:true,...settings.rows[0],...queue.rows[0]});
 }catch(e){if((e as {code?:string})?.code==='42P01')return NextResponse.json({ok:true,configured:opsConfigured(),prepared:false,enabled:false,ready:false,pending:0,failed:0});return NextResponse.json({ok:false,error:'storage_unavailable'},{status:503});}
}
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({ok:false,error:'forbidden'},{status:403});
 const admin=await requireAdmin({superOnly:true});if(isResponse(admin))return admin;
 if(admin.mustChangePassword)return NextResponse.json({ok:false,error:'password_change_required'},{status:403});
 const {action}=await req.json().catch(()=>({}));
 try{
  if(action==='prepare'){
   await withTransaction(async client=>{
    await client.query("set local lock_timeout='5s'");await client.query('select pg_advisory_xact_lock(76017)');
    const checksum=createHash('sha256').update(OPS_SYNC_SQL).digest('hex').slice(0,16);
    const old=await client.query("select checksum from schema_migrations where name='0017_ops_inventory_sync.sql'");
    if(old.rows[0]){if(old.rows[0].checksum!==checksum)throw new Error();return;}
    await client.query(OPS_SYNC_SQL);
    await client.query("insert into schema_migrations(name,checksum) values('0017_ops_inventory_sync.sql',$1)",[checksum]);
    await client.query("insert into audit_log(actor_id,actor_email,actor_role,action,entity_type) values($1,$2,$3,'ops-sync.prepare','inventory')",[admin.id,admin.email,admin.role]);
   });
  }else if(action==='reconcile'){
   if(!opsConfigured())throw new Error();
   await opsAvailability(new Date().toISOString(),new Date(Date.now()+2*86400000).toISOString());
   // Pause new online checkouts until existing commitments have been reconciled.
   await getPool().query('update werigo_ops_sync_settings set enabled=true,ready=false,updated_at=now() where id=1');
   return NextResponse.json({ok:true,...await drainOpsQueue(5,true)});
  }else if(action==='retry'){
   return NextResponse.json({ok:true,rides_updated:await pullOpsRideStatus(),...await drainOpsQueue(5)});
  }else if(action==='activate'){
   if(!opsConfigured())throw new Error();
   await opsAvailability(new Date().toISOString(),new Date(Date.now()+2*86400000).toISOString());
   await withTransaction(async client=>{
    const count=await client.query('select count(*)::int n from werigo_ops_sync_queue where revision>synced_revision');
    if(count.rows[0]?.n)throw new Error();
    await client.query('update werigo_ops_sync_settings set enabled=true,ready=true,updated_at=now() where id=1');
    await client.query("insert into audit_log(actor_id,actor_email,actor_role,action,entity_type) values($1,$2,$3,'ops-sync.activate','inventory')",[admin.id,admin.email,admin.role]);
   });
  }else return NextResponse.json({ok:false,error:'invalid_action'},{status:422});
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({ok:false,error:'ops_sync_not_ready',message:'Check the connection and reconcile existing bookings before activation. Existing stock settings remain stored.'},{status:409});}
}
