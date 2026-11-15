// Execute the real handlers, store, payment logic and SQL triggers against a
// disposable PostgreSQL-compatible database. Only identity/session/provider I/O
// is substituted. No environment changes or external network calls are needed.
import assert from 'node:assert/strict';
import {registerHooks,createRequire} from 'node:module';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
const require=createRequire(import.meta.url),root=new URL('../',import.meta.url);
const db=new PGlite();let checks=0,queue=Promise.resolve(),requestNumber=0,connectionNumber=0;const paymentLocks=new Map();
function check(value,message){assert.ok(value,message);checks++;}
function queued(fn){const result=queue.then(fn);queue=result.catch(()=>{});return result;}
globalThis.__paymentTestDb={
 connect:async()=>{const connection=++connectionNumber;return {query:async(sql,params)=>{
  // PGlite has one backend session. Model only connection-scoped advisory
  // ownership here; every business query and trigger still runs in Postgres.
  if(sql.includes('pg_try_advisory_lock')){const owner=paymentLocks.get(params[0]);if(owner&&owner!==connection)return {rows:[{locked:false}]};paymentLocks.set(params[0],connection);return {rows:[{locked:true}]};}
  if(sql.includes('pg_advisory_unlock')){if(paymentLocks.get(params[0])===connection)paymentLocks.delete(params[0]);return {rows:[{pg_advisory_unlock:true}]};}
  return queued(()=>db.query(sql,params));
 },release:()=>{for(const [key,owner] of paymentLocks)if(owner===connection)paymentLocks.delete(key);}};},
 query:(...args)=>queued(()=>db.query(...args)),
 transaction:fn=>queued(async()=>{await db.exec('BEGIN');try{const result=await fn({query:(...args)=>db.query(...args)});await db.exec('COMMIT');return result;}catch(e){await db.exec('ROLLBACK');throw e;}}),
};
globalThis.__paymentTestUser={id:'payment-test-user',name:'Local QA',email:'qa@example.invalid',role:'customer'};
globalThis.__paymentTestGateway={calls:[],statuses:new Map(),error:null,signature:true};
const asModule=source=>'data:text/javascript,'+encodeURIComponent(source);
const mocks={
 'server-only':asModule('export default {};'),
 '@/lib/db':asModule('export const getPool=()=>globalThis.__paymentTestDb;export const isDatabaseConfigured=()=>true;export const withTransaction=fn=>globalThis.__paymentTestDb.transaction(fn);'),
 '@/lib/session':asModule('export const getSessionUser=async()=>globalThis.__paymentTestUser;'),
 '@/lib/adminAuth':asModule('export const getAdmin=async()=>null;'),
 '@/lib/identity':asModule('export const hasIdentity=async()=>true;'),
 '@/lib/bookingMode':asModule('export const WHATSAPP_FIRST_BOOKING=false;'),
 '@/lib/discounts':asModule('export const resolveDiscounts=async()=>({options:[]});export const pickDiscount=()=>null;'),
 '@/lib/notifications':asModule('export const notifyBookingPaid=async()=>{};'),
 '@/lib/referrals':asModule('export const syncReferralForBooking=async()=>{};'),
 '@/lib/midtrans':asModule(`export const MidtransError=globalThis.__paymentTestMidtrans.MidtransError;
 export const mapTransactionStatus=globalThis.__paymentTestMidtrans.mapTransactionStatus;
 export const isMidtransConfigured=()=>true;
 export const verifyNotificationSignature=()=>globalThis.__paymentTestGateway.signature;
 export const fetchTransactionStatus=async id=>globalThis.__paymentTestGateway.statuses.get(id)||null;
 export const createSnapTransaction=async input=>{const g=globalThis.__paymentTestGateway;g.calls.push(input);if(g.onCreate)await g.onCreate(input);if(g.error)throw g.error;return {token:'local-token-'+input.orderId,redirectUrl:'https://example.invalid/payment',expiresAt:new Date()};};`),
};
registerHooks({resolve(specifier,context,next){
 if(mocks[specifier])return {url:mocks[specifier],shortCircuit:true};
 if(specifier==='next/server')return next(pathToFileURL(require.resolve('next/server.js')).href,context);
 if(specifier.startsWith('@/'))return next(new URL('src/'+specifier.slice(2)+'.ts',root).href,context);
 if(specifier.startsWith('.')&&context.parentURL?.startsWith(root.href)){
  const url=new URL(specifier,context.parentURL);if(!/\.[a-z]+$/i.test(url.pathname)&&existsSync(fileURLToPath(url)+'.ts'))return next(url.href+'.ts',context);
 }
 return next(specifier,context);
}});
globalThis.__paymentTestMidtrans=await import('../src/lib/midtrans.ts');
for(const f of readdirSync(new URL('../db/migrations',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())await db.exec('BEGIN;'+readFileSync(new URL('../db/migrations/'+f,import.meta.url),'utf8')+'COMMIT;');
await db.query('INSERT INTO public."user"(id,name,email,"emailVerified",role) VALUES($1,$2,$3,true,\'customer\')',['payment-test-user','Local QA','qa@example.invalid']);
await db.query("INSERT INTO ops.units(id,code,model,usage,state,created_at,updated_at) VALUES('qa-unit','QA-UNIT','edpower','rental','ready',$1,$1)",[Date.now()]);
await db.exec('UPDATE ops.settings SET ready=true WHERE id=1');
const {NextRequest}=await import('next/server');
const {POST:createBooking}=await import('../src/app/api/bookings/route.ts');
const {POST:payBooking}=await import('../src/app/api/bookings/[code]/pay/route.ts');
const {POST:notification}=await import('../src/app/api/payments/midtrans/notify/route.ts');
const {syncPaymentStatus}=await import('../src/lib/payments.ts');
const {getBookingStore}=await import('../src/lib/bookingStore.ts');
const realFetch=globalThis.fetch;
globalThis.fetch=async()=>{throw new Error('UNEXPECTED_EXTERNAL_NETWORK_IN_LOCAL_TEST');};
const store=getBookingStore(),gateway=globalThis.__paymentTestGateway;
function payload(id=randomUUID()){return {clientSubmissionId:id,fullName:'Local QA',whatsapp:'+12025550123',email:'qa@example.invalid',pickupArea:'showroom',returnArea:'showroom',startAt:'2098-02-08T09:00:00+08:00',endAt:'2098-02-11T09:00:00+08:00',vehicleModel:'edpower',quantity:1,deliveryMethod:'pickup',riderResponsibilitiesAccepted:true,privacyConsent:true,sourcePage:'/app/rent/checkout',discountKey:'none',website:'',totalIdr:1,ratePerDayIdr:1};}
async function post(handler,body,path='/api/bookings',ctx){const response=await handler(new NextRequest('https://werigo.co'+path,{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-for':'192.0.2.'+(++requestNumber)},body:JSON.stringify(body)}),ctx);return {http:response.status,data:await response.json()};}
async function available(){return (await db.query("SELECT count(*)::int n FROM ops.available_units('edpower','',$1,$2)",[Date.parse(payload().endAt),Date.parse(payload().startAt)])).rows[0].n;}
async function bookingRow(code){return (await db.query('SELECT * FROM public.bookings WHERE booking_code=$1',[code])).rows[0];}
async function reset(){await queue;await db.exec('TRUNCATE ops.handovers,ops.payments,ops.website_bookings,ops.bookings,ops.customers,public.payments,public.booking_events,public.bookings RESTART IDENTITY CASCADE');gateway.calls=[];gateway.statuses.clear();gateway.error=null;gateway.signature=true;gateway.onCreate=null;}
function status(orderId,state='settlement',amount='570000'){return {order_id:orderId,transaction_status:state,fraud_status:'accept',status_code:'200',gross_amount:amount,payment_type:'qris',transaction_id:'local-provider-id',transaction_time:'2026-11-15 12:00:00',...(state==='settlement'?{settlement_time:'2026-11-15 12:00:01'}:{})};}
try{
 const signedIn=globalThis.__paymentTestUser;globalThis.__paymentTestUser=null;
 check((await post(createBooking,payload())).http===401,'Unauthenticated calls cannot reserve stock');globalThis.__paymentTestUser=signedIn;
 gateway.onCreate=async input=>check((await globalThis.__paymentTestDb.query('SELECT count(*)::int n FROM public.payments WHERE order_id=$1',[input.orderId])).rows[0].n===1,'Payment intent is durable before the provider request');
 const first=await post(createBooking,payload());check(first.http===201,'Real booking handler returns a payment session');
 const b=await bookingRow(first.data.booking.bookingCode);
 check((await db.query('SELECT status FROM ops.bookings WHERE id=$1',['web:'+b.id])).rows[0].status==='pending_payment','The booking is in Ops before the payment response returns');
 check(await available()===0,'Starting checkout holds the last physical unit');
 check((await post(createBooking,payload())).http===409,'Another booking for the held unit is rejected');
 check(gateway.calls.length===1,'A rejected second booking never starts a payment');
 check(gateway.calls[0].grossAmount===570000,'Only the server price is sent to the gateway');
 check(gateway.calls[0].finishUrl.includes('/app/rent/confirmation?'),'External payment returns to PWA confirmation');
 await syncPaymentStatus(first.data.payment.orderId,status(first.data.payment.orderId),'local-provider');
 check((await bookingRow(b.booking_code)).payment_status==='paid','Verified settlement marks the website booking paid');
 check((await db.query('SELECT status FROM ops.bookings WHERE id=$1',['web:'+b.id])).rows[0].status==='confirmed','Paid booking is confirmed in Ops');
 check((await db.query('SELECT count(*)::int n FROM ops.payments')).rows[0].n===1,'The verified receipt appears once in Ops');
 await syncPaymentStatus(first.data.payment.orderId,status(first.data.payment.orderId),'provider-replay');
 check((await db.query('SELECT count(*)::int n FROM ops.payments')).rows[0].n===1,'Duplicate settlement does not duplicate the receipt');
 await store.setPaymentState(b.id,{payment_status:'expired',status:'expired'},'stale-expiry-snapshot');
 check((await bookingRow(b.booking_code)).payment_status==='paid','A stale expiry cannot downgrade a paid booking inside the locked transaction');
 check(await available()===0,'A stale expiry cannot release a paid unit');
 await syncPaymentStatus(first.data.payment.orderId,status(first.data.payment.orderId,'pending'),'out-of-order');
 check((await db.query('SELECT transaction_status FROM public.payments WHERE booking_id=$1',[b.id])).rows[0].transaction_status==='settlement','An out-of-order pending event cannot downgrade the payment ledger');
 await syncPaymentStatus(first.data.payment.orderId,status(first.data.payment.orderId,'partial_refund'),'partial-refund');
 check((await bookingRow(b.booking_code)).payment_status==='paid'&&await available()===0,'A partial refund does not release a paid rental');
 await syncPaymentStatus(first.data.payment.orderId,status(first.data.payment.orderId,'partial_chargeback'),'partial-dispute');
 check(await available()===0,'A partial chargeback also retains the physical reservation');
 await syncPaymentStatus(first.data.payment.orderId,status(first.data.payment.orderId,'refund'),'verified-refund');
 await syncPaymentStatus(first.data.payment.orderId,status(first.data.payment.orderId),'stale-settlement');
 check((await bookingRow(b.booking_code)).payment_status==='refunded','A stale settlement does not reactivate a refunded booking');

 await reset();const repeated=payload();const repeats=await Promise.all([post(createBooking,repeated),post(createBooking,repeated)]);
 check(repeats.every(r=>[200,201,503].includes(r.http)),'Concurrent same-submission retries have controlled responses');
 check((await db.query('SELECT count(*)::int n FROM public.bookings')).rows[0].n===1,'Concurrent retries create one booking');
 check(gateway.calls.length===1,'Concurrent retries create only one gateway session');
 check((await db.query('SELECT count(*)::int n FROM public.payments')).rows[0].n===1,'Concurrent retries retain one payment record');
 const replay=await post(createBooking,repeated);check(replay.http===200&&replay.data.duplicate===true,'A later retry reuses the same booking');

 await reset();const timeoutBody=payload();gateway.error=new globalThis.__paymentTestMidtrans.MidtransError('request_failed','simulated timeout');
 const timeout=await post(createBooking,timeoutBody);
 check(timeout.http===503&&timeout.data.error==='payment_pending_verification','A lost gateway response reports an unknown outcome');
 check(await available()===0,'A gateway timeout never frees a potentially payable unit');
 check((await db.query('SELECT transaction_status FROM public.payments')).rows[0].transaction_status==='initialization_unknown','Unknown payment initialization is persisted for reconciliation');
 const order=gateway.calls[0].orderId;gateway.error=null;const recovered=await post(createBooking,timeoutBody);
 check(recovered.http===200&&recovered.data.payment?.snapToken,'Retry recovers the saved booking without a new reservation');
 check(gateway.calls[1].orderId===order,'Recovery reuses the same gateway order ID');
 check((await db.query('SELECT count(*)::int n FROM public.payments')).rows[0].n===1,'Unknown-outcome recovery does not duplicate payment records');

 await reset();gateway.error=new globalThis.__paymentTestMidtrans.MidtransError('rejected','invalid request',422);
 const rejected=await post(createBooking,payload());check(rejected.http===503&&rejected.data.error==='payment_unavailable','A definitive rejection is handled separately');
 check(await available()===1,'A definite rejection releases the hold');
 check((await db.query('SELECT count(*)::int n FROM ops.payments')).rows[0].n===0,'Rejected initialization never creates a receipt');

 await reset();const waiting=await post(createBooking,payload()),wb=await bookingRow(waiting.data.booking.bookingCode),wo=waiting.data.payment.orderId;
 await assert.rejects(()=>syncPaymentStatus(wo,{...status(wo),status_code:'201'},'unverified-status'),/PAYMENT_STATUS_UNVERIFIED/);checks++;
 await assert.rejects(()=>syncPaymentStatus(wo,status(wo,'settlement','1'),'wrong-amount'),/PAYMENT_AMOUNT_MISMATCH/);checks++;
 check((await bookingRow(wb.booking_code)).payment_status==='pending','Wrong amount cannot mark a booking paid');
 check((await db.query('SELECT transaction_status FROM public.payments WHERE booking_id=$1',[wb.id])).rows[0].transaction_status==='pending','Wrong amount cannot corrupt the payment ledger');
 check((await db.query('SELECT count(*)::int n FROM ops.payments')).rows[0].n===0,'Wrong amount creates no Ops receipt');
 gateway.signature=false;const denied=await post(notification,{order_id:wo,status_code:'200',gross_amount:'570000',signature_key:'0'.repeat(128),transaction_status:'settlement'},'/api/payments/midtrans/notify');
 check(denied.http===403,'The webhook rejects an invalid signature');gateway.signature=true;
 gateway.statuses.set(wo,status(wo,'pending'));
 const untrusted=await post(notification,{order_id:wo,status_code:'200',gross_amount:'570000',signature_key:'0'.repeat(128),transaction_status:'settlement'},'/api/payments/midtrans/notify');
 check(untrusted.http===200&&(await bookingRow(wb.booking_code)).payment_status==='pending','The webhook trusts provider status, not the request claim');
 await db.query("UPDATE public.bookings SET payment_expires_at=now()-interval '1 minute' WHERE id=$1",[wb.id]);
 const beforeCalls=gateway.calls.length;
 const pendingPay=await post(payBooking,{},'/api/bookings/'+wb.booking_code+'/pay',{params:Promise.resolve({code:wb.booking_code})});
 check(pendingPay.http===409&&pendingPay.data.error==='payment_pending_verification','An unresolved old payment blocks a second payment attempt');
 check(gateway.calls.length===beforeCalls&&await available()===0,'Unresolved payment keeps stock held without another gateway order');
 await syncPaymentStatus(wo,status(wo,'expire'),'verified-expiry');
 check(await available()===1,'Provider-verified expiry releases the physical unit');
 check((await db.query('SELECT status FROM ops.bookings WHERE id=$1',['web:'+wb.id])).rows[0].status==='cancelled','Expiry is reflected in Ops');
 console.log(`${checks} real-handler booking/payment/Ops checks passed; gateway simulated; no env changed or external payment made.`);
}finally{globalThis.fetch=realFetch;await queue;await db.close();}
