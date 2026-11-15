import {db,uid} from './server';
import type {Row} from './domain';
export function extensionChargeInsert(charge:Row,where:string,args:unknown[]){
 const fields=['id','rental_id','booking_id','amount','old_end','new_end','note','paid_at','method','reference','actor','paid_by','created_at'];
 return db().prepare(`INSERT INTO rental_extensions(${fields.join(',')}) SELECT ${fields.map(()=>'?').join(',')} WHERE ${where}`).bind(...fields.map(k=>charge[k]??null),...args);
}
export function nativeExtensionReceipt(charge:Row,where:string,args:unknown[]){
 return db().prepare(`INSERT INTO payments(id,request_id,booking_id,extension_id,kind,amount,method,reference,paid_at,note,actor,created_at) SELECT ?,?,?,?,'rental',?,?,?,?,?,?,? WHERE ${where}`).bind(uid(),'extension:'+charge.id,charge.booking_id,charge.id,charge.amount,charge.method,charge.reference,charge.paid_at,'Rental extension · '+charge.note,charge.paid_by,charge.created_at,...args);
}
