'use client';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/Button';
interface SyncStatus {configured:boolean;prepared:boolean;enabled:boolean;ready:boolean;pending:number;failed:number}
export function OpsSyncPanel(){
 const [status,setStatus]=useState<SyncStatus|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function load(){const response=await fetch('/api/admin/ops-sync',{cache:'no-store'});if(response.status===403)return;const data=await response.json();if(response.ok&&data.ok)setStatus(data);}
 useEffect(()=>{let stopped=false;void fetch('/api/admin/ops-sync',{cache:'no-store'}).then(async response=>{const data=await response.json();if(!stopped&&response.ok&&data.ok)setStatus(data);}).catch(()=>{if(!stopped)setError('Could not load connection status.');});return()=>{stopped=true;};},[]);
 async function run(action:string){setBusy(true);setError('');try{
  const response=await fetch('/api/admin/ops-sync',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action})});const data=await response.json();
  if(!response.ok)throw new Error(data.message||'Could not complete this step.');await load();
 }catch(e){setError(e instanceof Error?e.message:'Could not connect.');}finally{setBusy(false);}}
 if(!status)return null;
 return <section className="mt-6 rounded-[14px] border border-line bg-card p-5">
  <h2 className="font-display text-xl text-ink">Werigo Ops connection</h2>
  <p className="mt-2 text-sm text-ink-soft">{status.ready?'Connected. Ops manages physical units and reservations. Website bookings appear in Ops automatically.':status.enabled?'Reconciliation in progress. New online payments are paused until existing bookings are safely allocated.':'Not active. Existing website booking settings are still in use.'}</p>
  <p className="mt-2 text-sm text-ink">{status.configured?'Service credentials configured.':'Service credentials need to be added to both apps.'} {status.prepared?`${status.pending} booking updates pending · ${status.failed} need attention.`:'Database setup required.'}</p>
  <p className="mt-2 text-xs leading-relaxed text-ink-soft">Review Ops stock, imported rentals and existing website bookings before reconciliation. Do not create a second manual booking for an order already imported. Payment receipts remain in website admin; verify them before handover.</p>
  {error&&<p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
  <div className="mt-4 flex flex-wrap gap-3">
   {!status.prepared&&<Button disabled={busy} onClick={()=>void run('prepare')}>Prepare database</Button>}
   {status.prepared&&status.configured&&!status.ready&&<Button disabled={busy} variant="outline" onClick={()=>{if(window.confirm('Pause new online checkouts and allocate existing website bookings in Ops? Review existing rentals first.'))void run('reconcile');}}>Reconcile bookings</Button>}
   {status.prepared&&status.configured&&status.enabled&&!status.ready&&status.pending===0&&<Button disabled={busy} onClick={()=>void run('activate')}>Activate connection</Button>}
   {status.ready&&<Button variant="outline" disabled={busy} onClick={()=>void run('retry')}>Sync now</Button>}
   <Button variant="outline" disabled={busy} onClick={()=>void load()}>Refresh status</Button>
  </div>
 </section>;
}
