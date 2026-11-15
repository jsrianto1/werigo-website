import {websitePublicKey} from '@/lib/opsServiceProtocol';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 try{return Response.json({key:websitePublicKey(process.env.BETTER_AUTH_SECRET||'')},{headers:{'Cache-Control':'public, max-age=300'}});}
 catch{return Response.json({error:'unavailable'},{status:503});}
}
