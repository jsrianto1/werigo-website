import {requireAdmin,isResponse} from '@/lib/adminApi';
import {opsReady} from '@/ops/lib/database';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){const admin=await requireAdmin({superOnly:true});if(isResponse(admin))return admin;
 try{const ready=await opsReady();return Response.json({ok:true,mode:'shared_database',configured:true,prepared:ready,enabled:ready,ready,pending:0,failed:0},{headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({ok:false,error:'storage_unavailable'},{status:503});}
}
// Schema migration is an explicit hosting operation, never a public setup API.
export async function POST(){const admin=await requireAdmin({superOnly:true});if(isResponse(admin))return admin;return Response.json({ok:false,error:'hosting_migration_required'},{status:409});}
