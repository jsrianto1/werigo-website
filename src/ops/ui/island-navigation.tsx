"use client";
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Bike, CalendarDays, LayoutDashboard, NotebookPen, X, ArrowUpRight, Smartphone, LockKeyhole, LogOut } from './icons';
import { useLanguage } from './language';
import { lockDialogScroll } from './dialog-scroll';

export type NavigationItem = { id: string; label: string; icon: ComponentType<any>; count?: number };
type Props = {
  page: string; items: NavigationItem[]; open: boolean; onOpenChange: (open: boolean) => void;
  onNavigate: (page: string) => void; name: string; role: string;
  onInstall: () => void; onSignOut: () => void;
};

function AllApps({size=22}:{size?:number}) {
  return <svg className="ops-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3.5" y="3.5" width="6" height="6" rx="2"/><rect x="14.5" y="3.5" width="6" height="6" rx="2"/><rect x="3.5" y="14.5" width="6" height="6" rx="2"/><rect x="14.5" y="14.5" width="6" height="6" rx="2"/></svg>;
}

export function IslandNavigation({page,items,open,onOpenChange,onNavigate,name,role,onInstall,onSignOut}: Props) {
  const {language,t}=useLanguage();
  const dialog=useRef<HTMLDialogElement>(null);
  const [visible,setVisible]=useState(false);
  const dock=[
    {id:'dashboard',label:language==='en'?'Home':'Beranda',icon:LayoutDashboard},
    {id:'rentals',label:language==='en'?'Rentals':'Rental',icon:CalendarDays},
    {id:'fleet',label:language==='en'?'Fleet':'Unit',icon:Bike},
    {id:'notes',label:language==='en'?'Notes':'Catatan',icon:NotebookPen},
    {id:'more',label:language==='en'?'More':'Lainnya',icon:AllApps},
  ];
  const dockIndex=dock.findIndex(n=>n.id===page);
  const selected=open||dockIndex===-1?4:dockIndex;
  useEffect(()=>{
    const el=dialog.current;
    if(!el)return;
    let frame=0,timer:ReturnType<typeof setTimeout>|undefined;
    if(open){
      if(!el.open)el.showModal();
      frame=requestAnimationFrame(()=>setVisible(true));
    }else{
      setVisible(false);
      const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      timer=setTimeout(()=>el.close(),reduce?0:200);
    }
    return()=>{cancelAnimationFrame(frame);clearTimeout(timer);};
  },[open]);
  useEffect(()=>()=>dialog.current?.close(),[]);
  useEffect(()=>open?lockDialogScroll():undefined,[open]);
  const go=(id:string)=>{onOpenChange(false);onNavigate(id);};
  return <>
    <nav className="island-dock" aria-label={language==='en'?'Island navigation':'Navigasi island'}>
      <div className="island-active-track" aria-hidden="true" style={{clipPath:`inset(0 ${100-(selected+1)*20}% 0 ${selected*20}% round 23px)`}}>{dock.map(({id,label,icon:Icon},index)=><span className={`island-active-item ${selected===index?'is-current':''}`} key={id}><Icon size={21}/><span>{label}</span></span>)}</div>
      {dock.map(({id,label,icon:Icon},index)=><button key={id} type="button" className={selected===index?'is-current':''} aria-current={id===page?'page':undefined} aria-label={id==='more'?(language==='en'?'Open all pages':'Buka semua halaman'):label} aria-haspopup={id==='more'?'dialog':undefined} aria-expanded={id==='more'?open:undefined} aria-controls={id==='more'?'island-menu':undefined} onClick={()=>id==='more'?onOpenChange(!open):go(id)}><Icon size={21}/><span>{label}</span></button>)}
    </nav>
    <dialog ref={dialog} id="island-menu" className="island-sheet" data-visible={visible} aria-labelledby="island-menu-title" onCancel={e=>{e.preventDefault();onOpenChange(false);}} onClick={e=>{if(e.target===dialog.current){const r=dialog.current.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onOpenChange(false);}}}>
      <div className="island-sheet-head"><div><span className="eyebrow">WERIGO OPS</span><h2 id="island-menu-title">{language==='en'?'Your workspace':'Ruang kerja tim'}</h2><p>{language==='en'?'Everything you need, one tap away.':'Semua yang dibutuhkan, tinggal pilih.'}</p></div><button type="button" className="icon-btn" aria-label={t('Tutup')} onClick={()=>onOpenChange(false)}><X size={20}/></button></div>
      <nav className="island-page-grid" aria-label={t('Menu utama')}>
        {items.map(({id,label,icon:Icon,count})=><button key={id} type="button" className={id===page?'is-current':''} aria-current={id===page?'page':undefined} onClick={()=>go(id)}><span className="island-page-icon"><Icon size={21}/></span><span>{t(label)}</span>{count? <b>{count}</b>:<ArrowUpRight className="island-page-arrow" size={15}/>}</button>)}
      </nav>
      <div className="island-account"><span className="avatar">{name.slice(0,1).toUpperCase()}</span><div><strong>{name}</strong><small>{role}</small></div><button type="button" className="text-btn" onClick={()=>go('account')}><LockKeyhole size={15}/>{t('Login saya')}</button></div>
      <div className="island-sheet-foot"><button type="button" onClick={()=>{onOpenChange(false);onInstall();}}><Smartphone size={17}/>{t('Pasang aplikasi')}</button><button type="button" onClick={onSignOut}><LogOut size={17}/>{t('Keluar dari aplikasi')}</button></div>
    </dialog>
  </>;
}
