import 'server-only';
import {getPool,isDatabaseConfigured,withTransaction} from '@/lib/db';
import {opsReady} from '@/ops/lib/database';
export class OpsInventoryError extends Error {constructor(public code:'stock_unavailable'|'sync_unavailable'|'sync_not_ready'){super(code);this.name='OpsInventoryError';}}
export function opsConfigured(){return isDatabaseConfigured();}
export async function opsEnabled(){return opsReady();}
export async function opsAvailability(start:string,end:string){
 const rows=await getPool().query(`SELECT m.model,
 (SELECT count(*)::int FROM ops.units u WHERE u.model=m.model AND u.usage='rental') total,
 (SELECT count(*)::int FROM ops.available_units(m.model,'',$2::bigint,$1::bigint)) available
 FROM (VALUES ('bees'),('victory'),('athena'),('edpower')) m(model)`,[Date.parse(start),Date.parse(end)]);
 return rows.rows as {model:string;total:number;available:number}[];
}
// Compatibility for existing payment/admin callers. Physical allocation already
// committed atomically with the website booking, in the same PostgreSQL.
export async function syncOpsBooking(id:string,_force=false){
 if(!await opsEnabled())return;
 try{await withTransaction(async client=>{await client.query('SELECT ops.sync_website_booking($1::uuid)',[id]);});}
 catch(e){throw new OpsInventoryError((e as Error).message==='stock_unavailable'?'stock_unavailable':'sync_unavailable');}
}
export async function drainOpsQueue(_limit=25,_force=false){return {synced:0,failed:0};}
export async function pullOpsRideStatus(){return 0;}
