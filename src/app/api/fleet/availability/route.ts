import {NextResponse} from 'next/server';
import {opsEnabled,opsAvailability} from '@/lib/opsInventory';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(req:Request){
 const url=new URL(req.url),start=url.searchParams.get('start')||'',end=url.searchParams.get('end')||'';
 const a=Date.parse(start),b=Date.parse(end);
 if(!Number.isFinite(a)||!Number.isFinite(b)||b-a<2*86400000||b-a>730*86400000)return NextResponse.json({ok:false,error:'invalid_dates'},{status:422});
 try{
  if(!await opsEnabled())return NextResponse.json({ok:true,enabled:false},{headers:{'Cache-Control':'no-store'}});
  const stock=await opsAvailability(start,end);
  return NextResponse.json({ok:true,enabled:true,stock:stock.map(r=>({model:r.model,available:r.available})),checked_at:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({ok:false,error:'availability_unavailable',message:'Availability could not be confirmed. Please retry or contact Werigo.'},{status:503});}
}
