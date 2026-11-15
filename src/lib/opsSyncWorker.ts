import 'server-only';
import {getPool} from '@/lib/db';
import {getBookingStore} from '@/lib/bookingStore';
import {refreshPendingPayment} from '@/lib/payments';
import {drainOpsQueue,opsEnabled,pullOpsRideStatus} from '@/lib/opsInventory';
export async function runOpsSyncWorker(reason:'cron'|'handover'='cron'){
 if(!await opsEnabled())return {expired:0,rides_updated:0,ops_sync:{synced:0,failed:0}};
 const pending=reason==='cron'?await getPool().query("select id from bookings where payment_status='pending' and payment_expires_at<now() order by payment_expires_at limit 1"):{rows:[]};
 for(const row of pending.rows){const current=await getBookingStore().get(row.id);if(current)await refreshPendingPayment(current.booking);}
 const expired=await getBookingStore().expirePending(),rides=await pullOpsRideStatus(),sync=await drainOpsQueue(pending.rows.length?1:5);
 return {expired:expired.length,rides_updated:rides,ops_sync:sync};
}
