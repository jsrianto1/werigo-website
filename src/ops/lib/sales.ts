import type {Row} from './domain';
export function sourceSalesSummary(rows:Row[]){
 const rentals=rows.filter(r=>r.category==='active'||r.category==='completed'),refunds=rows.filter(r=>r.category==='refund');
 const gross=rentals.reduce((sum,r)=>sum+r.amount_idr,0),refund=refunds.reduce((sum,r)=>sum+r.amount_idr,0);
 return {gross,refund,net:gross-refund,rentals:rentals.length,refunds:refunds.length,snapshot:rows.map(r=>r.snapshot_date).filter(Boolean).sort().at(-1)||''};
}
