"use client";
import { useEffect, useState, useRef } from "react";
import { formatIdr } from "@/lib/pricing";
type Member={id:string;name:string;email:string;tier:string;balance:number;spend:string};
export function MembershipManager({ canAdjust }: {canAdjust:boolean}) {
  const [members,setMembers]=useState<Member[]>([]);
  const [ready,setReady]=useState<boolean|null>(null);
  const [search,setSearch]=useState("");
  const [error,setError]=useState("");
  const [selected,setSelected]=useState<Member|null>(null);
  const [points,setPoints]=useState("");
  const [reason,setReason]=useState("");
  const [busy,setBusy]=useState(false);
  const [history,setHistory]=useState<{points:number;note:string;revoked:boolean}[]>([]);
  const correctionRequest=useRef<{key:string;id:string}|null>(null);
  async function load(value="") {
    const response=await fetch(`/api/admin/membership?search=${encodeURIComponent(value)}`,{cache:"no-store"});
    const data=await response.json();
    if (!response.ok) throw new Error("Unable to load members.");
    setMembers(data.members);setReady(data.ready);
  }
  useEffect(()=>{
    let current=true;
    void fetch("/api/admin/membership",{cache:"no-store"}).then(async response=>{
      if(!response.ok)throw new Error();
      const data=await response.json();
      if(current){setMembers(data.members);setReady(data.ready);}
    }).catch(()=>{if(current)setError("Unable to load members. Please try again.");});
    return ()=>{current=false;};
  },[]);
  async function select(member:Member) {
    setSelected(member);setHistory([]);setError("");
    try {
      const response=await fetch(`/api/admin/membership?userId=${encodeURIComponent(member.id)}`);
      const data=await response.json();
      if (!response.ok) throw new Error();
      setHistory(data.summary?.history??[]);
    } catch {setError("Unable to load points history.");}
  }
  async function adjust(event:React.FormEvent) {
    event.preventDefault();if (!selected || busy) return;
    setBusy(true);setError("");
    const key=JSON.stringify([selected.id,Number(points),reason]);
    if(correctionRequest.current?.key!==key)correctionRequest.current={key,id:crypto.randomUUID()};
    try {
      const response=await fetch("/api/admin/membership",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({userId:selected.id,points:Number(points),reason,requestId:correctionRequest.current.id})});
      if (!response.ok) throw new Error("Correction failed. Check the available points and try again.");
      correctionRequest.current=null;setSelected(null);setPoints("");setReason("");await load(search);
    } catch(e) {setError(e instanceof Error?e.message:"Correction failed.");}
    finally{setBusy(false);}
  }
  return <div><p className="eyebrow">Werigo Ride Club</p><h1 className="font-display text-3xl">Membership</h1>
    <p className="mt-2 text-sm text-ink-soft">Silver: 2% · Gold: 2.5% · Platinum: 3%. Corrections require a reason and are logged.</p>
    {ready===false && <div className="mt-6 rounded-xl border border-line p-5"><p>Database setup is pending. Booking and voucher functions continue normally.</p>
      {canAdjust && <button disabled={busy} className="mt-4 rounded bg-primary px-4 py-2 text-white" onClick={async()=>{
        setBusy(true);setError("");try {const response=await fetch("/api/admin/membership/setup",{method:"POST"});if(!response.ok) throw new Error();await load(search);}catch{setError("Setup could not complete. Ask your database administrator to apply migration 0009_ride_club.sql.");}finally{setBusy(false);}
      }}>{busy?"Setting up…":"Activate Ride Club"}</button>}</div>}
    {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
    {ready && <><form className="mt-6 flex gap-3" onSubmit={e=>{e.preventDefault();void load(search).catch(()=>setError("Search failed."));}}><input aria-label="Find member by name or email" value={search} onChange={e=>setSearch(e.target.value)} className="min-w-0 flex-1 rounded border border-line p-3" placeholder="Name or email"/><button className="rounded bg-primary px-4 text-white">Search</button></form>
      <ul className="mt-5 divide-y divide-line">{members.map(m=><li key={m.id} className="flex flex-wrap justify-between gap-3 py-4"><div><p className="font-semibold">{m.name}</p><p className="text-sm text-ink-soft">{m.email}</p><p className="text-sm">{m.tier} · {formatIdr(Number(m.spend))} qualifying rentals</p></div><button className="text-primary" onClick={()=>void select(m)}>{m.balance} points · View</button></li>)}</ul>
      {members.length===0 && <p className="mt-4">No members found.</p>}
      {selected && <div className="mt-5 rounded-xl border border-line p-5"><h2 className="text-xl font-semibold">{selected.name}</h2><ul className="mt-3 text-sm">{history.map((h,i)=><li key={i} className="py-1">+{h.points} · {h.note}{h.revoked?" · reversed":""}</li>)}</ul>
        {canAdjust && <form onSubmit={adjust} className="mt-4 grid gap-3"><label>Point correction<input required type="number" min="-10000" max="10000" value={points} onChange={e=>setPoints(e.target.value)} className="ml-3 rounded border border-line p-2"/></label><label>Reason<input required minLength={5} maxLength={300} value={reason} onChange={e=>setReason(e.target.value)} className="mt-1 block w-full rounded border border-line p-2"/></label><button disabled={busy} className="justify-self-start rounded bg-primary px-4 py-2 text-white">{busy?"Saving…":"Record correction"}</button></form>}
      </div>}</>}
  </div>;
}
