import {withTransaction} from '@/lib/db';
import { db,currentStaff,txt,uid,json,fail,AppError,sameOrigin,auditStatement } from "@/ops/lib/server";
export const dynamic="force-dynamic";
export async function POST(req:Request){try{
 sameOrigin(req);const member=await currentStaff();
 if(Number(req.headers.get("content-length"))>7*1024*1024)throw new AppError("Maksimum foto 6 MB.");const form=await req.formData();const file=form.get("file");
 if(!file||typeof file==="string"||file.size<20||file.size>6*1024*1024)throw new AppError("Pilih foto JPG, PNG, atau WebP, maksimum 6 MB.");
 const bytes=new Uint8Array(await file.arrayBuffer());let mime="";if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)mime="image/jpeg";if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71)mime="image/png";if(new TextDecoder().decode(bytes.slice(0,4))==="RIFF"&&new TextDecoder().decode(bytes.slice(8,12))==="WEBP")mime="image/webp";
 if(!mime)throw new AppError("Format belum didukung. Gunakan JPG, PNG, atau WebP.");const id=uid(),key="evidence/"+id;
 await withTransaction(async client=>{
  await client.query('SELECT pg_advisory_xact_lock(76019)');
  await client.query('INSERT INTO ops.files(id,storage_key,mime,name,size,actor,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,key,mime,txt(file.name,180),file.size,member.email,Date.now()]);
  await client.query('INSERT INTO ops.file_contents(file_id,content) VALUES($1,$2)',[id,Buffer.from(bytes)]);
  await client.query("INSERT INTO ops.audit(id,action,entity_id,detail,actor,created_at) VALUES($1,'files.uploaded',$2,$3,$4,$5)",[uid(),id,JSON.stringify({mime,size:file.size}),member.email,Date.now()]);
 });
 return json({ok:true,id});
 }catch(e){return fail(e);}}
