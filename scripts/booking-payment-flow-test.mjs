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
async function pgQuery(sql,params){const result=await db.query(sql,params);return {...result,command:sql.trim().split(/\s/)[0].toUpperCase(),rowCount:result.affectedRows??result.rows.length};}
globalThis.__paymentTestDb={
 connect:async()=>{const connection=++connectionNumber;return {query:async(sql,params)=>{
  // PGlite has one backend session. Model only connection-scoped advisory
  // ownership here; every business query and trigger still runs in Postgres.
  if(sql.includes('pg_try_advisory_lock')){const owner=paymentLocks.get(params[0]);if(owner&&owner!==connection)return {rows:[{locked:false}]};paymentLocks.set(params[0],connection);return {rows:[{locked:true}]};}
  if(sql.includes('pg_advisory_unlock')){if(paymentLocks.get(params[0])===connection)paymentLocks.delete(params[0]);return {rows:[{pg_advisory_unlock:true}]};}
  return queued(()=>pgQuery(sql,params));
 },release:()=>{for(const [key,owner] of paymentLocks)if(owner===connection)paymentLocks.delete(key);}};},
 query:(...args)=>queued(()=>pgQuery(...args)),
 transaction:fn=>queued(async()=>{await db.exec('BEGIN');try{const result=await fn({query:(...args)=>pgQuery(...args)});await db.exec('COMMIT');return result;}catch(e){await db.exec('ROLLBACK');throw e;}}),
};
globalThis.__paymentTestUser={id:'payment-test-user',name:'Local QA',email:'qa@example.invalid',role:'customer'};
globalThis.__opsReverseStaff={id:'local-ops',name:'Local Ops',email:'ops-qa@example.invalid',role:'owner'};
globalThis.__paymentTestGateway={calls:[],statuses:new Map(),expiredSnaps:new Set(),error:null,signature:true};
const asModule=source=>'data:text/javascript,'+encodeURIComponent(source);
const opsAuthMock=asModule('export const resolveMember=async()=>globalThis.__opsReverseStaff;');
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
 export const isSnapPageExpired=async token=>globalThis.__paymentTestGateway.expiredSnaps.has(token);
 export const createSnapTransaction=async input=>{const g=globalThis.__paymentTestGateway;g.calls.push(input);if(g.onCreate)await g.onCreate(input);if(g.error)throw g.error;return {token:'local-token-'+input.orderId,redirectUrl:'https://example.invalid/payment',expiresAt:new Date()};};`),
};
registerHooks({resolve(specifier,context,next){
 if(specifier==='./auth'&&context.parentURL?.endsWith('/src/ops/lib/server.ts'))return {url:opsAuthMock,shortCircuit:true};
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
const {POST:opsMutation}=await import('../src/app/api/ops/data/route.ts');
const {GET:fleetAvailability}=await import('../src/app/api/fleet/availability/route.ts');
const {rentalUpdatePlan}=await import('../src/ops/lib/rental-workflow.ts');
const {POST:sourceRentalUpdate}=await import('../src/app/api/ops/rental-update/route.ts');
const {rescheduleQuote}=await import('../src/ops/lib/booking-schedule.ts');
const {syncPaymentStatus,refreshPendingPayment}=await import('../src/lib/payments.ts');
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
 const stalePromotion=await post(createBooking,{...payload(),discountKey:'promotion:'+randomUUID(),promoCode:'NEWCHRISTMAS'});
 check(stalePromotion.http===409&&stalePromotion.data.error==='discount_changed','A stale selected promotion cannot silently charge the full rental');
 check(await available()===1&&gateway.calls.length===0,'Rejected promotion creates no inventory hold or payment session');
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
 await reset();const abandoned=await post(createBooking,payload()),ab=await bookingRow(abandoned.data.booking.bookingCode);
 await db.query("UPDATE public.payments SET expires_at=now()-interval '1 minute' WHERE booking_id=$1",[ab.id]);
 await refreshPendingPayment(ab);
 check(await available()===0,'An unknown Core transaction alone never releases an abandoned checkout');
 gateway.expiredSnaps.add(abandoned.data.payment.snapToken);
 await refreshPendingPayment(ab);
 check((await bookingRow(ab.booking_code)).payment_status==='expired'&&await available()===1,'Confirmed Snap expiry plus absent Core releases an abandoned checkout');
 check((await db.query('SELECT count(*)::int n FROM ops.payments')).rows[0].n===0,'Snap expiry creates no false payment receipt');
 await reset();const delayed=await post(createBooking,payload()),delayedBooking=await bookingRow(delayed.data.booking.bookingCode),delayedOrder=delayed.data.payment.orderId;
 await db.query("UPDATE public.payments SET expires_at=now()-interval '1 minute' WHERE booking_id=$1",[delayedBooking.id]);
 gateway.expiredSnaps.add(delayed.data.payment.snapToken);gateway.statuses.set(delayedOrder,status(delayedOrder,'pending'));
 await refreshPendingPayment(delayedBooking);
 check(await available()===0&&(await bookingRow(delayedBooking.booking_code)).payment_status==='pending','A pending payment method keeps its hold even when the Snap page expired');

 // Reverse direction: real Ops API validation, transaction adapter and SQL
 // guards feed the exact availability endpoint used by website and PWA.
 await reset();
 const opsPost=async(action,data)=>{const response=await opsMutation(new Request('https://werigo.co/api/ops/data',{method:'POST',headers:{Origin:'https://werigo.co','Content-Type':'application/json'},body:JSON.stringify({action,data})}));return {http:response.status,data:await response.json()};};
 const publicStock=async()=>{const response=await fleetAvailability(new Request('https://werigo.co/api/fleet/availability?'+new URLSearchParams({start:payload().startAt,end:payload().endAt})));const data=await response.json();check(response.headers.get('Cache-Control')==='no-store','Availability responses cannot be cached');return data.stock.find(r=>r.model==='edpower').available;};
 const customer=await opsPost('saveCustomer',{name:'Local reverse QA',phone:'+12025550123'});
 check(customer.http===200,'Ops API creates the local fixture customer');
 const manual={customer_id:customer.data.id,unit_ids:['qa-unit'],start_at:Date.parse(payload().startAt),end_at:Date.parse(payload().endAt),source:'Walk-in',status:'draft',discount_idr:0,fee_idr:0};
 const draft=await opsPost('createBooking',manual);
 check(draft.http===200&&await publicStock()===1,'An Ops draft does not reserve website/PWA stock');
 const confirmed=await opsPost('changeBooking',{id:draft.data.id,mode:'confirm'});
 check(confirmed.http===200&&await publicStock()===0,'Confirming a manual Ops booking immediately reduces public stock');
 check((await opsPost('createBooking',{...manual,status:'confirmed'})).http===409,'Another Ops booking cannot take the held unit');
 check((await post(createBooking,payload())).http===409&&gateway.calls.length===0,'Website checkout rejects an Ops-held bike before starting payment');
 globalThis.__opsReverseStaff.role='ops';
 check((await opsPost('changeBooking',{id:draft.data.id,mode:'cancel',reason:'Local QA cleanup'})).http===403,'Cancellation still requires the existing manager/owner permission');
 check(await publicStock()===0,'An unauthorized cancellation cannot release website/PWA stock');
 globalThis.__opsReverseStaff.role='owner';
 const cancelled=await opsPost('changeBooking',{id:draft.data.id,mode:'cancel',reason:'Local QA cleanup'});
 check(cancelled.http===200&&await publicStock()===1,'Cancelling an Ops booking immediately restores public stock');
 const online=await post(createBooking,payload());
 check(online.http===201&&await publicStock()===0,'Online checkout can reserve the unit after Ops cancellation');
 check((await opsPost('createBooking',{...manual,status:'confirmed'})).http===409,'An Ops booking cannot take a website/PWA-held bike');
 check((await db.query('SELECT count(*)::int n FROM ops.payments')).rows[0].n===0,'Manual reverse-direction tests create no false payment receipts');

 // Changing a manual schedule must atomically move both the physical hold
 // and its agreed quote, without editing receipts or charging failed changes.
 await reset();
 const scheduleCustomer=await opsPost('saveCustomer',{name:'Local schedule QA',phone:'+12025550123'});
 const originalStart=Date.parse(payload().startAt),originalEnd=Date.parse(payload().endAt),day=86400000;
 const scheduled=await opsPost('createBooking',{...manual,customer_id:scheduleCustomer.data.id,status:'confirmed'});
 const sid=scheduled.data.id;
 const manualRow=async()=>(await db.query('SELECT * FROM ops.bookings WHERE id=$1',[sid])).rows[0];
 const stockFor=async(begin,finish)=>{const r=await fleetAvailability(new Request('https://werigo.co/api/fleet/availability?'+new URLSearchParams({start:new Date(begin).toISOString(),end:new Date(finish).toISOString()})));return (await r.json()).stock.find(x=>x.model==='edpower').available;};
 const future=await post(createBooking,{...payload(),startAt:new Date(originalEnd+4*day).toISOString(),endAt:new Date(originalEnd+7*day).toISOString()});
 check(future.http===201,'A later online reservation exists before testing extension conflicts');
 const initial=await manualRow();
 for(const payment_status of ['unpaid','paid']){
  const blocked=await opsPost('changeBooking',{id:sid,mode:'extend',expected_updated_at:initial.updated_at,end_at:originalEnd+5*day,extra_idr:100000,reason:'Local conflicting extension',payment_status,paid_at:Date.now(),method:'Tunai',reference:'LOCAL QA ONLY'});
  check(blocked.http===409,'A conflicting '+payment_status+' extension is rejected');
 }
 check((await manualRow()).end_at===originalEnd&&(await manualRow()).base_idr===570000,'Rejected extensions preserve dates and agreed rent');
 check((await db.query('SELECT count(*)::int n FROM ops.rental_extensions')).rows[0].n===0&&(await db.query('SELECT count(*)::int n FROM ops.payments')).rows[0].n===0,'Rejected extension rolls back both extra charges and any receipt');
 check(await stockFor(originalEnd+3600000,originalEnd+2*day+3600000)===1,'The unextended tail starts free after the preparation buffer');
 const extended=await opsPost('changeBooking',{id:sid,mode:'extend',expected_updated_at:initial.updated_at,end_at:originalEnd+2*day,extra_idr:100000,reason:'Local accepted extension',payment_status:'unpaid'});
 check(extended.http===200&&await stockFor(originalEnd+3600000,originalEnd+2*day+3600000)===0,'An accepted extension immediately holds the newly added dates in the public API');
 const afterExtend=await manualRow();
 check(afterExtend.base_idr===670000&&(await db.query('SELECT paid_at FROM ops.rental_extensions')).rows[0].paid_at===null,'An agreed unpaid extension increases the bill without claiming money was received');
 check((await opsPost('changeBooking',{id:sid,mode:'extend',expected_updated_at:initial.updated_at,end_at:originalEnd+3*day,extra_idr:1,reason:'Stale extension'})).http===409,'A stale extension cannot overwrite a newer schedule');
 const movedStart=originalStart+30*day,movedEnd=movedStart+(afterExtend.end_at-afterExtend.start_at);
 const moveBody={id:sid,mode:'reschedule',expected_updated_at:afterExtend.updated_at,start_at:movedStart,end_at:movedEnd,expected_total_idr:670000,confirm_schedule:true,reason:'Local agreed date change'};
 check((await opsPost('changeBooking',moveBody)).http===200,'Ops can reschedule an uncollected booking');
 check(await stockFor(originalStart,originalEnd)===1&&await stockFor(movedStart,movedEnd)===0,'Rescheduling frees the old public dates and holds the new public dates');
 let current=await manualRow();
 check(current.base_idr===670000&&current.discount_idr===afterExtend.discount_idr&&current.fee_idr===afterExtend.fee_idr,'A date-only move preserves rent, discount, fees and extension agreement');
 check((await opsPost('changeBooking',moveBody)).http===409,'Rescheduling rejects stale operator snapshots');
 const conflictStart=originalEnd+4*day;
 check((await opsPost('changeBooking',{...moveBody,expected_updated_at:current.updated_at,start_at:conflictStart,end_at:conflictStart+(movedEnd-movedStart)})).http===409,'Rescheduling into a later online booking is rejected');
 check((await manualRow()).start_at===movedStart&&await stockFor(movedStart,movedEnd)===0,'A conflicting move leaves the original hold intact');
 check((await db.query("SELECT count(*)::int n FROM ops.audit WHERE action='booking.rescheduled' AND entity_id=$1",[sid])).rows[0].n===1,'Failed date changes leave no false successful audit record');
 check((await opsPost('changeBooking',{...moveBody,expected_updated_at:current.updated_at,end_at:movedStart+day,expected_total_idr:1})).http===400,'Duration changes still enforce the two-day minimum');
 check((await opsPost('changeBooking',{...moveBody,expected_updated_at:current.updated_at,end_at:movedEnd+day,expected_total_idr:860001})).http===409,'A stale or forged price preview cannot silently change the agreed total');
 check((await opsPost('changeBooking',{...moveBody,expected_updated_at:current.updated_at,confirm_schedule:false})).http===400,'The operator must confirm the new schedule and total');
 check((await opsPost('changeBooking',{...moveBody,expected_updated_at:current.updated_at,end_at:movedEnd+day,expected_total_idr:860000})).http===200,'A duration increase uses the tariff difference while preserving the existing agreement');
 current=await manualRow();check(current.base_idr===860000,'The longer rescheduled booking has the previewed total');
 globalThis.__opsReverseStaff.role='ops';
 check((await opsPost('changeBooking',{...moveBody,expected_updated_at:current.updated_at})).http===403,'Reducing the total still requires manager/owner approval');
 globalThis.__opsReverseStaff.role='owner';
 check((await opsPost('changeBooking',{...moveBody,expected_updated_at:current.updated_at})).http===200,'An authorized operator can approve a shorter unpaid booking');
 current=await manualRow();
 const receipt=await opsPost('recordPayment',{booking_id:sid,kind:'rental',amount:570000,method:'Tunai',reference:'LOCAL QA ONLY',paid_at:Date.now(),request_id:randomUUID()});
 check(receipt.http===200,'A local receipt fixture can pay the original rent independently of the unpaid extension');
 check((await opsPost('changeBooking',{...moveBody,expected_updated_at:current.updated_at,end_at:movedStart+2*day,expected_total_idr:100000})).http===409,'Shortening below recorded money/extension charges requires a real refund first');
 check((await manualRow()).base_idr===670000&&(await db.query('SELECT count(*)::int n FROM ops.payments')).rows[0].n===1,'Rejected price reductions neither edit nor invent payment receipts');
 const onlineRow=await bookingRow(future.data.booking.bookingCode);
 check((await opsPost('changeBooking',{...moveBody,id:'web:'+onlineRow.id})).http===409,'Online payment reservations retain their separate website-admin financial guard');
 await db.query("UPDATE ops.bookings SET status='active' WHERE id=$1",[sid]);
 check((await opsPost('changeBooking',{...moveBody,expected_updated_at:(await manualRow()).updated_at})).http===409,'A rental already out cannot move its historical handover schedule');
 const monthly={...current,start_at:Date.parse('2028-02-01T09:00:00+08:00'),end_at:Date.parse('2028-03-02T09:00:00+08:00'),base_idr:2800000,discount_idr:0,fee_idr:0};
 check(rescheduleQuote(monthly,['edpower'],Date.parse('2028-03-01T09:00:00+08:00'),Date.parse('2028-03-31T09:00:00+08:00')).total===2800000,'A same-duration monthly date shift preserves its agreement across calendar boundaries');
 const sourceNow=Date.parse('2028-03-09T09:00:00+08:00'),sourceEnd=Date.parse('2028-03-12T00:00:00+08:00');
 const source={updated_at:1,unit_ids:'["qa-unit"]',source_status:'Active',followup_state:'open',start_date:'2028-03-08',end_date:'2028-03-10',extension_idr:0};
 const change={mode:'extend',expected_updated_at:1,end_date:'2028-03-11',extra_idr:0,note:'Local source extension'};
 const context={role:'owner',now:sourceNow,units:[{id:'qa-unit'}],bookings:[]};
 const upcoming={unit_ids:'["qa-unit"]',status:'confirmed',start_at:sourceEnd+1800000,end_at:sourceEnd+3*day};
 assert.throws(()=>rentalUpdatePlan(source,change,{...context,bookings:[upcoming]}),/one hour/);checks++;
 check(rentalUpdatePlan(source,change,{...context,bookings:[{...upcoming,start_at:sourceEnd+3600000}]}).mode==='extend','Imported-rental extension allows the exact one-hour preparation boundary');
 assert.throws(()=>rentalUpdatePlan(source,change,{...context,bookings:[{...upcoming,status:'active',start_at:sourceNow-3*day,end_at:sourceNow-day}]}),/one hour/);checks++;
 check(rentalUpdatePlan(source,change,{...context,bookings:[{...upcoming,status:'cancelled'}]}).mode==='extend','A cancelled future booking does not block an imported-rental extension');
 await reset();
 const sourceCustomer=await opsPost('saveCustomer',{name:'Local imported schedule QA',phone:'+12025550123'});
 const boundary=Date.parse('2098-02-12T00:00:00+08:00');
 const nextManual=await opsPost('createBooking',{...manual,customer_id:sourceCustomer.data.id,status:'confirmed',start_at:boundary+1800000,end_at:boundary+3*day+1800000});
 check(nextManual.http===200,'A fixture future booking starts inside the imported extension preparation window');
 const imported={id:'local-source-schedule',source_id:'local-test',source_row:1,customer_id:sourceCustomer.data.id,customer_name:'Local QA',unit_ids:'["qa-unit"]',model:'edpower',color:'red',vin:'LOCAL TEST',engine_number:'LOCAL TEST',quantity:1,days:3,daily_rate:190000,revenue:570000,start_date:'2098-02-08',end_date:'2098-02-10',source_status:'Active',sales:'',delivery:'',lead_source:'',payment_scheme:'',flags:'[]',finance_ids:'[]',source_data:'{}',followup_state:'open',followup_note:'',created_at:1,updated_at:1};
 const fields=Object.keys(imported);await db.query(`INSERT INTO ops.rental_records(${fields.join(',')}) VALUES(${fields.map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(imported));
 const sourcePost=async(data)=>{const response=await sourceRentalUpdate(new Request('https://werigo.co/api/ops/rental-update',{method:'POST',headers:{Origin:'https://werigo.co','Content-Type':'application/json'},body:JSON.stringify(data)}));return {http:response.status,data:await response.json()};};
 const sourceBody={id:imported.id,mode:'extend',expected_updated_at:1,end_date:'2098-02-11',extra_idr:100000,note:'Local imported extension',payment_status:'unpaid'};
 for(const payment_status of ['unpaid','paid'])check([400,409].includes((await sourcePost({...sourceBody,payment_status,paid_at:Date.now(),method:'Tunai',reference:'LOCAL QA ONLY'})).http),'Imported '+payment_status+' extension cannot consume the one-hour preparation window');
 check((await db.query('SELECT count(*)::int n FROM ops.rental_events')).rows[0].n===0&&(await db.query('SELECT count(*)::int n FROM ops.rental_extensions')).rows[0].n===0,'Rejected imported extensions leave neither events nor financial charges');
 check((await opsPost('changeBooking',{id:nextManual.data.id,mode:'cancel',reason:'Local release of future slot'})).http===200,'The conflicting future slot can be cancelled normally');
 check((await sourcePost(sourceBody)).http===200,'Imported extension succeeds once the conflict is removed');
 const sourceSaved=(await db.query('SELECT * FROM ops.rental_records WHERE id=$1',[imported.id])).rows[0];
 check(sourceSaved.operational_end_date==='2098-02-11'&&Number(sourceSaved.extension_idr)===100000,'Imported planned return and agreed extra fee update together');
 check((await db.query('SELECT paid_at FROM ops.rental_extensions')).rows[0].paid_at===null&&(await db.query('SELECT count(*)::int n FROM ops.payments')).rows[0].n===0,'An unpaid imported extension never creates a paid receipt');
 check((await sourcePost(sourceBody)).http===409&&(await db.query('SELECT count(*)::int n FROM ops.rental_extensions')).rows[0].n===1,'A stale imported extension cannot duplicate its charge');
 console.log(`${checks} real-handler booking/payment/Ops checks passed; gateway simulated; no env changed or external payment made.`);
}finally{globalThis.fetch=realFetch;await queue;await db.close();}
