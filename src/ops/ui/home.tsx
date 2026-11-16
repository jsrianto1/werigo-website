import {redirect} from 'next/navigation';
import {getAdmin} from '@/lib/adminAuth';
import {getAdminOverview} from '@/lib/adminOverview';
import {AdminHome} from '@/components/admin/AdminHome';
import {AdminShell} from '@/components/admin/AdminShell';
import {optionalOpsMember} from '@/ops/lib/workspace-context';
import {opsReady} from '@/ops/lib/database';
import {Login} from './login';
import OpsApp from './ops-app';
import {LanguageProvider} from './language';
export const dynamic='force-dynamic';
export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const [member,admin,params]=await Promise.all([opsReady().then(ready=>ready?optionalOpsMember():null),getAdmin(),searchParams]);
 if(admin?.mustChangePassword)redirect('/admin/profile?change=1');
 const connect=params.connect;
 if((connect==='website'&&member)||(connect==='ops'&&admin))return <div className="werigo-ops"><LanguageProvider><Login initialMode={connect==='website'?'website':'ops'} connecting/></LanguageProvider></div>;
 if(member)return <div className="werigo-ops"><LanguageProvider><OpsApp opsRole={member.role} displayName={member.name} initialPage={typeof params.view==='string'?params.view:undefined} websiteRole={admin?.role} websiteName={admin?.name}/></LanguageProvider></div>;
 if(admin){
  let overview=null;try{overview=await getAdminOverview();}catch{console.error('[workspace] Website overview unavailable');}
  return <AdminShell adminEmail={admin.email} adminName={admin.name} adminRole={admin.role} mustChangePassword={admin.mustChangePassword}><AdminHome name={admin.name} role={admin.role} overview={overview}/></AdminShell>;
 }
 return <div className="werigo-ops"><LanguageProvider><Login/></LanguageProvider></div>;
}
