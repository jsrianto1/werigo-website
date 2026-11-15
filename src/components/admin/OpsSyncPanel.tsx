'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
export function OpsSyncPanel(){const [ready,setReady]=useState<boolean|null>(null);
 useEffect(()=>{let active=true;fetch('/api/admin/ops-sync',{cache:'no-store'}).then(async r=>{const d=await r.json();if(active&&r.ok)setReady(d.ready===true);}).catch(()=>{});return()=>{active=false;};},[]);
 return <section className="mt-6 rounded-[14px] border border-line bg-card p-5"><h2 className="font-display text-xl text-ink">Werigo Ops</h2><p className="mt-2 text-sm text-ink-soft">{ready?'Physical units, website bookings and Ops share one database. Availability and reservations update in the same transaction.':ready===false?'The Ops migration is being prepared. Existing website settings remain active.':'Checking Ops status…'}</p>{ready&&<Link className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white" href="/ops">Open Werigo Ops →</Link>}</section>;
}
