export const MODELS=["bees","victory","athena","edpower"] as const;
export const MODEL_NAMES:Record<string,string>={bees:"Bees",victory:"Victory",athena:"Athena",edpower:"EdPower"};
export const RATES:Record<string,number[]>={bees:[90000,80000,70000,60000,50000],victory:[120000,100000,85000,70000,60000],athena:[140000,120000,100000,80000,70000],edpower:[190000,150000,125000,100000,2800000/30]};
export const PARTNER_RATES:Record<string,number>={bees:1200000,victory:1400000,athena:1650000,edpower:2200000};
export const TIER_NAMES=["2–6 hari","7–13 hari","14–20 hari","21 hari–<1 bulan","≥1 bulan kalender"];
export const DAY=86400000;
export const HANDOVER_CONSENT={
 en:"I have reviewed the rental summary, motorcycle condition and accessories recorded in this handover.",
 id:"Saya telah memeriksa ringkasan, kondisi motor dan kelengkapan yang tercatat pada bukti serah terima ini.",
};
export type Row=Record<string,any>;
export function idr(n:number){return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n||0);}
export function localInput(ms:number){return new Date(ms+8*3600000).toISOString().slice(0,16);}
export function parseWita(value:string){return Date.parse(value+":00+08:00");}
export function dateWita(ms:number){return new Date(ms+8*3600000).toISOString().slice(0,10);}
export function fmtDate(ms:number,short=false,language:"en"|"id"="en"){return new Intl.DateTimeFormat(language==="en"?"en-GB":"id-ID",{timeZone:"Asia/Makassar",day:"numeric",month:short?"short":"long",year:short?undefined:"numeric",hour:"2-digit",minute:"2-digit"}).format(ms);}
export function calendarMonthAfter(ms:number){const d=new Date(ms+8*3600000);const day=d.getUTCDate();d.setUTCMonth(d.getUTCMonth()+1);if(d.getUTCDate()!==day)d.setUTCDate(0);return d.getTime()-8*3600000;}
export function quote(models:string[],start:number,end:number){
 const days=Math.ceil((end-start)/DAY);if(!Number.isFinite(days)||days<2)throw new Error("Minimum rental 2 hari. Periksa tanggal dan jam.");
 const tier=end>=calendarMonthAfter(start)?4:days>=21?3:days>=14?2:days>=7?1:0;
 const lines=models.map(model=>{if(!RATES[model])throw new Error("Model tidak dikenal.");return {model,days,tier,rate:RATES[model][tier],amount:Math.round(RATES[model][tier]*days)};});
 return {days,tier,lines,total:lines.reduce((s,x)=>s+x.amount,0)};
}
export function totalBooking(b:Row){return b.base_idr-b.discount_idr+b.fee_idr;}
export function paymentTotals(payments:Row[],bookingId?:string){return payments.filter(p=>!bookingId||p.booking_id===bookingId).reduce((a,p)=>{if(p.kind==="rental")a.rental+=p.amount;if(p.kind==="refund")a.rental-=p.amount;if(p.kind==="deposit")a.deposit+=p.amount;if(p.kind==="deposit_refund")a.deposit-=p.amount;return a;},{rental:0,deposit:0});}
export function allocatedRental(b:Row,start:number,end:number){
 if(["cancelled","draft","pending_payment"].includes(b.status)||end<=start)return 0;
 const days=Math.ceil((b.end_at-b.start_at)/DAY);if(days<=0)return 0;
 const value=Math.max(0,b.base_idr-b.discount_idr);
 // A started 24-hour service block is a billed day. Cumulative rounding keeps adjacent periods additive.
 const until=(t:number)=>Math.round(value*Math.max(0,Math.min(days,Math.ceil((t-b.start_at)/DAY)))/days);
 return until(end)-until(start);
}
export function reportData(bookings:Row[],payments:Row[],start:number,end:number,extensions:Row[]=[]){
 const cash=paymentTotals(payments.filter(p=>p.paid_at>=start&&p.paid_at<end));
 const sourcePaid=extensions.filter(e=>e.rental_id&&e.paid_at!=null&&e.paid_at>=start&&e.paid_at<end).reduce((s,e)=>s+e.amount,0),sourceDue=extensions.filter(e=>e.rental_id&&e.paid_at==null).reduce((s,e)=>s+e.amount,0);
 return {cash:cash.rental+sourcePaid,depositMovement:cash.deposit,service:bookings.reduce((s,b)=>s+allocatedRental(b,start,end),0),billed:bookings.filter(b=>!["cancelled","draft","pending_payment"].includes(b.status)&&b.start_at>=start&&b.start_at<end).reduce((s,b)=>s+totalBooking(b),0),outstanding:sourceDue+bookings.filter(b=>!["cancelled","draft","pending_payment"].includes(b.status)).reduce((s,b)=>s+Math.max(0,totalBooking(b)-paymentTotals(payments,b.id).rental),0)};
}
export function csvCell(value:unknown){let s=String(value??"");if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
