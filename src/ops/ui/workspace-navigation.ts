import {opsPageIds} from '@/ops/lib/workspace-access';
import {LayoutDashboard,Bike,CalendarDays,Users,ClipboardCheck,Wallet,ChartNoAxesCombined,MessageSquare,NotebookPen,BookOpen,ShieldCheck,Bell,FileSpreadsheet} from './icons';
import {modulesFor} from '@/components/admin/modules';
import type {NavigationItem} from './island-navigation';

export const OPS_PAGES=[
 {id:'dashboard',label:'Beranda',icon:LayoutDashboard},
 {id:'settings',label:'User & akses',icon:Users},
 {id:'activity',label:'Aktivitas user',icon:ShieldCheck},
 {id:'reminders',label:'Pengingat rental',icon:Bell},
 {id:'sales',label:'Data sales',icon:FileSpreadsheet},
 {id:'rentals',label:'Data rental',icon:CalendarDays},
 {id:'bookings',label:'Booking',icon:CalendarDays},
 {id:'fleet',label:'Unit motor',icon:Bike},
 {id:'handovers',label:'Serah terima',icon:ClipboardCheck},
 {id:'customers',label:'Customer',icon:Users},
 {id:'payments',label:'Pembayaran',icon:Wallet},
 {id:'reports',label:'Laporan',icon:ChartNoAxesCombined},
 {id:'notes',label:'Catatan & keluhan',icon:NotebookPen},
 {id:'feedback',label:'Feedback customer',icon:MessageSquare},
 {id:'pricing',label:'Tarif & panduan',icon:BookOpen},
];
export function opsPages(role?:string):NavigationItem[]{
 const allowed=opsPageIds(role);return OPS_PAGES.filter(n=>allowed.includes(n.id));
}
export function websitePages(role?:string):NavigationItem[]{
 return modulesFor(role||'').map(m=>({id:m.href,label:m.label,icon:m.icon}));
}
export function workspaceTarget(id:string){
 if(id==='/admin/profile'||websitePages('super_admin').some(m=>m.id===id))return id;
 if(id==='account'||OPS_PAGES.some(m=>m.id===id))return '/ops?view='+encodeURIComponent(id);
 return '/ops';
}
