'use client';
import {authClient} from '@/lib/auth-client';

/** Clear both independently checked identities when leaving the workspace. */
export async function signOutWorkspace(){
 let failed=false;
 try{const r=await fetch('/api/ops/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!r.ok)failed=true;}catch{failed=true;}
 try{const r=await authClient.signOut();if(r.error)failed=true;}catch{failed=true;}
 if(failed)throw new Error('Could not fully sign out. Please retry. / Logout belum lengkap. Coba lagi.');
 location.assign('/ops');
}
