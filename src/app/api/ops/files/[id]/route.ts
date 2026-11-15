import {getPool} from '@/lib/db';
import { currentStaff,one,fail,AppError } from "@/ops/lib/server";
export const dynamic="force-dynamic";
export async function GET(_req:Request,ctx:{params:Promise<{id:string}>}){try{
 await currentStaff();const {id}=await ctx.params;const f=await one("files",id);const object=(await getPool().query('SELECT content FROM ops.file_contents WHERE file_id=$1',[id])).rows[0];if(!object)throw new AppError("Foto tidak ditemukan.",404);
 return new Response(new Uint8Array(object.content),{headers:{"Content-Type":f.mime,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Disposition":"inline; filename=\"werigo-evidence\""}});
 }catch(e){return fail(e);}}
