import {quote,type Row} from './domain';

/** Preserve the existing agreement; adjust only the tariff difference caused
 * by a duration change. Date-only moves keep the agreed rental amount. */
export function rescheduleQuote(booking:Row,models:string[],start:number,end:number){
 if(!models.length||models.length!==JSON.parse(booking.unit_ids).length)throw new Error('Reload the motorcycle list. / Muat ulang daftar motor.');
 const previous=quote(models,booking.start_at,booking.end_at),next=quote(models,start,end);
 const durationChanged=end-start!==booking.end_at-booking.start_at;
 const adjustment=durationChanged?next.total-previous.total:0;
 const base=booking.base_idr+adjustment,total=base-booking.discount_idr+booking.fee_idr;
 if(!Number.isSafeInteger(base)||base<booking.discount_idr||!Number.isSafeInteger(total)||total<0)throw new Error('Ask a manager to review the agreed price. / Minta pengelola meninjau kesepakatan harga.');
 return {days:next.days,durationChanged,adjustment,base,total,previousTariff:previous.total,nextTariff:next.total};
}
