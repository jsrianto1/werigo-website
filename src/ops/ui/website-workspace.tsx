'use client';
import {useState,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {LanguageProvider,LanguageSelect,useLanguage} from './language';
import {IslandNavigation} from './island-navigation';
import {opsPages,websitePages,workspaceTarget} from './workspace-navigation';
import {signOutWorkspace} from './workspace-signout';
import {CalendarDays,LayoutDashboard,Users,BookOpen,RefreshCw} from './icons';

type Props={name:string;role:string;opsRole?:string;opsName?:string;mustChangePassword?:boolean;children:ReactNode};
function Frame({name,role,opsRole,opsName,mustChangePassword,children}:Props){
 const pathname=usePathname(),{language}=useLanguage(),[menu,setMenu]=useState(false),[error,setError]=useState('');
 const page=websitePages(role).find(m=>pathname===m.id||pathname.startsWith(m.id+'/'))?.id||(pathname==='/ops'||pathname==='/admin'?'dashboard':'/admin/profile');
 const locked=mustChangePassword&&pathname!=='/admin/profile';
 const go=(id:string)=>location.assign(id==='account'?'/admin/profile':workspaceTarget(id));
 const dock=opsRole?undefined:[{id:'dashboard',label:language==='en'?'Home':'Beranda',icon:LayoutDashboard},{id:'/admin/bookings',label:language==='en'?'Bookings':'Booking',icon:CalendarDays},{id:'/admin/membership',label:'Club',icon:BookOpen},{id:'/admin/customers',label:'Customer',icon:Users}];
 return <div className="website-workspace">
  <div className="werigo-ops workspace-chrome"><div className="app-shell island-workspace">
   <header className="topbar"><div className="topbar-left"><a className="header-brand" href="/ops" aria-label="Werigo workspace"><img src="/brand/journey-loop-v20261119/wordmark-teal.svg" alt="Werigo"/><span>WORKSPACE</span></a></div><div className="topbar-right"><LanguageSelect/><button className="icon-btn" onClick={()=>location.reload()} aria-label={language==='en'?'Refresh':'Muat ulang'}><RefreshCw size={17}/></button><button className="island-profile-trigger" aria-label={language==='en'?'Open workspace menu':'Buka menu ruang kerja'} aria-haspopup="dialog" aria-expanded={menu} aria-controls="island-menu" onClick={()=>setMenu(true)}><span>{name.slice(0,1).toUpperCase()}</span></button></div></header>
   <IslandNavigation page={page} items={[...opsPages(opsRole),...websitePages(role)]} open={menu} onOpenChange={setMenu} onNavigate={go} name={name} role={role==='super_admin'?'Super admin':'Website admin'} accountPage="/admin/profile" dockItems={dock} onInstall={undefined} onSignOut={()=>void signOutWorkspace().catch(e=>setError(e.message))}/>
  </div></div>
  <main className="website-workspace-main" id="main-content">
   <div className="workspace-context"><a href="/ops">WERIGO / WORKSPACE</a><span>{opsName?`${language==='en'?'Operations':'Operasional'}: ${opsName} · `:''}{language==='en'?'Website admin':'Admin website'}: {name}</span></div>
   {error&&<p role="alert" className="workspace-notice">{error}</p>}
   {!opsRole&&<p className="workspace-notice">{language==='en'?'Your website modules are ready. Connect your existing Ops account to open rental operations in this workspace.':'Modul website sudah tersedia. Sambungkan akun Ops yang sudah ada untuk membuka operasional rental di workspace ini.'} <a href="/ops?connect=ops">{language==='en'?'Connect Ops':'Sambungkan Ops'} →</a></p>}
   {locked?<p className="workspace-notice">{language==='en'?'Set your own password before continuing.':'Buat password sendiri sebelum melanjutkan.'} <a href="/admin/profile?change=1">{language==='en'?'Account settings':'Pengaturan akun'} →</a></p>:children}
  </main>
 </div>;
}
export function WebsiteWorkspace(props:Props){return <LanguageProvider><Frame {...props}/></LanguageProvider>;}
