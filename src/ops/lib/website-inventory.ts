/** Shared by availability and allocation. Unknown stock is never sellable. */
export const RESERVING_STATUSES = ['pending_payment','confirmed','active'];
export const FREE_UNITS_SQL = `SELECT u.* FROM units u
 WHERE u.model=? AND u.state='ready' AND u.usage='rental'
 AND NOT EXISTS(SELECT 1 FROM rental_records r,json_each(r.unit_ids) j WHERE j.value=u.id AND r.source_status<>'Done' AND r.followup_state<>'returned')
 AND NOT EXISTS(SELECT 1 FROM handovers h WHERE h.unit_id=u.id AND h.kind='out' AND NOT EXISTS(SELECT 1 FROM handovers i WHERE i.booking_id=h.booking_id AND i.unit_id=h.unit_id AND i.kind='in'))
 AND NOT EXISTS(SELECT 1 FROM bookings b,json_each(b.unit_ids) j WHERE j.value=u.id AND b.id<>? AND b.status IN ('pending_payment','confirmed','active') AND b.start_at<?+3600000 AND b.end_at+3600000>?)
 ORDER BY u.code`;

export interface WebsiteBooking {
 id:string; code:string; revision:number; model:string; quantity:number;
 start:number; end:number; state:'pending'|'paid'|'confirmed'|'released'; expires:number|null;
 customer:{name:string;phone:string;email:string;address:string};
 base:number; discount:number; fee:number; total:number; location:string;
}
export function parseWebsiteBooking(input:unknown):WebsiteBooking {
 const b=input as WebsiteBooking;
 if(!b || !/^[0-9a-f-]{36}$/i.test(b.id) || !/^WRG-[A-Z0-9-]{4,60}$/i.test(b.code)
  || !Number.isSafeInteger(b.revision)||b.revision<1 || !['bees','victory','athena','edpower'].includes(b.model)
  || !Number.isInteger(b.quantity)||b.quantity<1||b.quantity>4
  || !Number.isSafeInteger(b.start)||!Number.isSafeInteger(b.end)||Math.ceil((b.end-b.start)/86400000)<2||b.end-b.start>730*86400000
  || !['pending','paid','confirmed','released'].includes(b.state)
  || ![b.base,b.discount,b.fee,b.total].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000)
  || b.base-b.discount+b.fee!==b.total || !b.customer
  || typeof b.customer.name!=='string'||!b.customer.name.trim()||b.customer.name.length>160
  || typeof b.customer.phone!=='string'||b.customer.phone.length>40
  || typeof b.customer.email!=='string'||b.customer.email.length>200
  || typeof b.customer.address!=='string'||b.customer.address.length>1600
  || typeof b.location!=='string'||b.location.length>1600
  || (b.state==='pending'&&(!Number.isSafeInteger(b.expires)||b.expires!<=0))) throw new Error('INVALID_WEBSITE_BOOKING');
 return b;
}

/** Constant-time HMAC verification. Signed payloads expire after five minutes. */
export async function verifyWebsiteSignature(secret:string, timestamp:string, body:string, signature:string, now=Date.now()) {
 if(secret.length<32||!/^\d{13}$/.test(timestamp)||Math.abs(now-Number(timestamp))>300000||!/^[a-f0-9]{64}$/i.test(signature))return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const bytes=new Uint8Array(signature.match(/../g)!.map(x=>parseInt(x,16)));
 return crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(timestamp+'.'+body));
}
