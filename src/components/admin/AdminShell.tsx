import type {ReactNode} from 'react';
import {optionalOpsMember} from '@/ops/lib/workspace-context';
import {WebsiteWorkspace} from '@/ops/ui/website-workspace';

/** Existing server/API gates remain authoritative; only the workspace frame is shared. */
export async function AdminShell({adminEmail,adminName,adminRole,mustChangePassword=false,children}:{adminEmail:string;adminName?:string;adminRole:string;mustChangePassword?:boolean;children:ReactNode}){
 const member=await optionalOpsMember();
 return <WebsiteWorkspace name={adminName||adminEmail} role={adminRole} opsRole={member?.role} opsName={member?.name} mustChangePassword={mustChangePassword}>{children}</WebsiteWorkspace>;
}
