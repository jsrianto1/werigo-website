import type {Row} from './domain';
export const PAYMENT_METHODS=['Transfer bank','Tunai','QRIS','Kartu','Lainnya'];
export const sourceExtensionReceipts=(extensions:Row[])=>extensions.filter(e=>e.rental_id&&e.paid_at!=null).map(e=>({id:'extension:'+e.id,booking_id:null,booking_code:'Rental extension · '+e.rental_id,kind:'rental',amount:e.amount,paid_at:e.paid_at,method:e.method,reference:e.reference}));
export function extensionPaymentInput(d:Row,now:number,required=false){
 const status=required?'paid':d.payment_status||'unpaid';if(!['paid','unpaid'].includes(status))throw new Error('Choose Paid or Unpaid. / Pilih sudah bayar atau belum bayar.');
 if(status==='unpaid')return {paid_at:null,method:'',reference:''};
 if(!Number.isSafeInteger(d.paid_at)||d.paid_at<946684800000||d.paid_at>now+300000)throw new Error('Check the actual payment date and time. / Periksa tanggal dan waktu pembayaran aktual.');
 if(!PAYMENT_METHODS.includes(d.method))throw new Error('Choose a payment method. / Pilih metode pembayaran.');
 if(d.reference!=null&&typeof d.reference!=='string'||String(d.reference||'').trim().length>200)throw new Error('Check the payment reference. / Periksa referensi pembayaran.');
 return {paid_at:d.paid_at as number,method:d.method as string,reference:String(d.reference||'').trim()};
}
export function extensionSummary(extensions:Row[],start=-Infinity,end=Infinity){
 const paid=extensions.filter(e=>e.paid_at!=null&&e.paid_at>=start&&e.paid_at<end),unpaid=extensions.filter(e=>e.paid_at==null);
 return {paid:paid.reduce((s,e)=>s+e.amount,0),unpaid:unpaid.reduce((s,e)=>s+e.amount,0),paidCount:paid.length,unpaidCount:unpaid.length,sourceCash:paid.filter(e=>e.rental_id).reduce((s,e)=>s+e.amount,0)};
}
