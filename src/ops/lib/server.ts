import type {OpsPreparedStatement} from '@/ops/lib/database';
import {opsDatabase} from './database';
import { resolveMember } from './auth';
import type { Row } from "./domain";
export class AppError extends Error { constructor(message:string,public status=400){super(message);} }
export function db(){return opsDatabase();}
export const uid=()=>crypto.randomUUID();
export function txt(v:unknown,max=2000,required=false){if(typeof v!=="string"&&v!=null)throw new AppError("Periksa format isian.");const s=String(v??"").trim();if(s.length>max||required&&!s)throw new AppError("Lengkapi isian wajib dan periksa panjang teks.");return s;}
export function num(v:unknown,min=0,max=1000000000){const n=Number(v);if(!Number.isSafeInteger(n)||n<min||n>max)throw new AppError("Periksa angka yang dimasukkan.");return n;}
export function choice(v:unknown,values:string[]){const s=String(v);if(!values.includes(s))throw new AppError("Pilihan tidak valid.");return s;}
export function timestamp(v:unknown){return num(v,946684800000,4102444800000);}
export async function one(table:string,id:string):Promise<Row>{const row=await db().prepare(`SELECT * FROM ${table} WHERE id=?`).bind(id).first<Row>();if(!row)throw new AppError("Data tidak ditemukan.",404);return row;}
export function sameOrigin(req:Request){const origin=req.headers.get("origin"),expected=new URL(process.env.NEXT_PUBLIC_SITE_URL||req.url).origin;if(!origin||origin!==expected)throw new AppError("Muat ulang aplikasi sebelum menyimpan.",403);}
export async function currentStaff(){
 const member=await resolveMember(db());if(!member)throw new AppError('Please sign in to Werigo Ops.',401);return member;
}
export function permitted(member:Row,roles:string[]){if(!roles.includes(member.role))throw new AppError("Aksi ini memerlukan akses pengelola atau finance.",403);}
export function auditStatement(action:string,entityId:string,detail:unknown,actor:string){return db().prepare("INSERT INTO audit(id,action,entity_id,detail,actor,created_at) VALUES(?,?,?,?,?,?)").bind(uid(),action,entityId,JSON.stringify(detail),actor,Date.now());}
export async function auditedMutation(statement:OpsPreparedStatement,action:string,entityId:string,detail:unknown,actor:string){
 const result=await db().batch([statement,db().prepare("INSERT INTO audit(id,action,entity_id,detail,actor,created_at) SELECT ?,?,?,?,?,? WHERE changes()>0").bind(uid(),action,entityId,JSON.stringify(detail),actor,Date.now())]);
 if(!result[0].meta.changes)throw new AppError("Data sudah berubah oleh petugas lain. Muat ulang lalu periksa kembali.",409);
}
export async function saveRow(table:string,row:Row,actor:string,action=table+".created"){
 const keys=Object.keys(row);await db().batch([db().prepare(`INSERT INTO ${table}(${keys.join(",")}) VALUES(${keys.map(()=>"?").join(",")})`).bind(...keys.map(k=>row[k])),auditStatement(action,row.id,row,actor)]);
}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});}
export function fail(e:unknown){
 const m=e instanceof Error?e.message:"";
 if(e instanceof AppError)return json({error:m},e.status);
 if(m.includes("SOURCE_RENTAL_OPEN"))return json({error:"Confirm the imported rental return first. Sold and internal-use bikes cannot be booked."},409);
 if(m.includes("BOOKING_CONFLICT"))return json({error:"Unit sudah memiliki booking di jadwal ini. Beri jeda persiapan 1 jam atau pilih unit lain."},409);
 if(m.includes("UNIT_NOT_READY"))return json({error:"Unit sedang servis/nonaktif. Ubah kondisi unit sebelum mengalokasikan."},409);
 if(m.includes("ACTIVE_UNIT"))return json({error:"Unit masih dipakai customer lain. Selesaikan pengembalian terlebih dahulu."},409);
 if(m.includes("INVALID_RETURN"))return json({error:"Periksa bukti motor keluar, waktu kembali, dan odometer. Odometer kembali tidak boleh lebih kecil."},409);
 if(m.includes("INVALID_STATUS"))return json({error:"Status booking sudah berubah. Muat ulang sebelum serah terima."},409);
 if(m.includes("STALE_BOOKING"))return json({error:"Ringkasan booking sudah berubah. Buka ulang dan periksa bersama customer."},409);
 if(m.includes("BALANCE_LIMIT"))return json({error:"Nominal melewati sisa tagihan atau saldo yang dapat dikembalikan. Muat ulang lalu periksa lagi."},409);
 if((e as {code?:string})?.code==='23505'||m.includes("UNIQUE constraint"))return json({error:"Data ini sudah tercatat. Periksa ID unit, plat, atau bukti yang sama."},409);
 if(m.includes("FOREIGN KEY"))return json({error:"Data terkait tidak ditemukan. Muat ulang lalu pilih kembali."},409);
 console.error("Werigo operation failed",e instanceof Error?e.name:"unknown");
 return json({error:"Data belum tersimpan. Coba lagi atau hubungi pengelola."},500);
}
export async function checkFiles(ids:unknown,member:Row){
 if(!Array.isArray(ids)||ids.length>8)throw new AppError("Maksimum 8 foto per catatan.");
 const clean=ids.map(x=>txt(x,80,true));
 for(const id of clean){const f=await one("files",id);if(f.actor!==member.email)throw new AppError("Pilih foto yang diunggah pada sesi ini.",403);}
 return clean;
}
