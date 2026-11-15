// Deliberate allowlist. Do not add identity documents, internal notes or payment tokens.
export function opsBookingState(b:{status:string;payment_status:string;payment_expires_at:string|null}):'pending'|'paid'|'confirmed'|'released'{
 if(['cancelled','completed','expired','no_response'].includes(b.status)||['refunded','failed','expired'].includes(b.payment_status))return 'released';
 if(b.payment_status==='paid')return 'paid';
 if(['confirmed','active'].includes(b.status)&&b.payment_status==='unpaid')return 'confirmed';
 // Expiry alone cannot prove that a last-minute payment failed. Keep the hold
 // until the website verifies the provider outcome or confirms no payment exists.
 return b.payment_status==='pending'?'pending':'released';
}
export function opsPayload(b:{id:string;booking_code:string;status:string;payment_status:string;payment_expires_at:string|null;vehicle_model:string;quantity:number;start_at:string;end_at:string;full_name:string;whatsapp_number:string;email:string|null;pickup_area:string;pickup_address:string|null;return_area:string;return_address:string|null;base_idr:number|null;discount_idr:number;area_fee_idr:number;total_idr:number|null},revision:number){
 return {id:b.id,code:b.booking_code,revision,model:b.vehicle_model,quantity:b.quantity,
 start:Date.parse(b.start_at),end:Date.parse(b.end_at),state:opsBookingState(b),expires:b.payment_expires_at?Date.parse(b.payment_expires_at):null,
 customer:{name:b.full_name,phone:b.whatsapp_number,email:b.email||'',address:b.pickup_address||''},
 location:[b.pickup_area,b.pickup_address,'Return: '+b.return_area,b.return_address].filter(Boolean).join(' · ').slice(0,1600),
 base:Number(b.base_idr||0),discount:Number(b.discount_idr||0),fee:Number(b.area_fee_idr||0),total:Number(b.total_idr||0)};
}
