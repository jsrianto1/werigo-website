import 'server-only';
import {currentStaff,AppError} from './server';

/** Optional Ops identity. Website admin authority is checked separately. */
export async function optionalOpsMember(){
 try{return await currentStaff();}
 catch(error){if(error instanceof AppError&&[401,403].includes(error.status))return null;throw error;}
}
