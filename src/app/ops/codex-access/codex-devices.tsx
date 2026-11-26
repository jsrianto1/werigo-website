'use client';

import {useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {ActionRow} from '@/components/ui/ActionRow';

type Device={id:string;label:string;expires_at:string;revoked_at:string|null;active:boolean};
export function CodexDevices({devices}:{devices:Device[]}) {
  const router=useRouter();
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  async function save(body:Record<string,unknown>) {
    setBusy(true);setNotice('');setError('');
    try {
      const r=await fetch('/api/ops/codex-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error);
      setNotice(body.action==='authorize'?'Perangkat Codex sudah disetujui.':'Akses perangkat dicabut.');
      router.refresh();
      return true;
    } catch(e) {setError(e instanceof Error?e.message:'Gagal menyimpan.');return false;}
    finally {setBusy(false);}
  }
  async function authorize(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form=event.currentTarget;
    if(await save({...Object.fromEntries(new FormData(form)),action:'authorize'}))form.reset();
  }
  return <>
    <form onSubmit={authorize}>
      <label className="field"><span>Nama perangkat</span><input name="label" defaultValue="Codex" required maxLength={48}/></label>
      <label className="field"><span>Public key perangkat</span><input name="public_key" required minLength={43} maxLength={43} autoCapitalize="none" autoComplete="off" spellCheck={false}/></label>
      <button type="submit" className="btn primary" disabled={busy}>Izinkan akses baca 30 hari</button>
    </form>
    {notice&&<p role="status">{notice}</p>}
    {error&&<p className="form-error" role="alert">{error}</p>}
    <h2 className="dual-directory-title">Perangkat Codex</h2>
    <div className="dual-account-list">
      {devices.map(d=><article className="panel dual-access-panel" key={d.id}>
          <strong>{d.label}</strong><p>ID: {d.id.slice(0,12)} · {d.active?'Aktif':d.revoked_at?'Dicabut':'Kedaluwarsa'}</p>
          <small>Berakhir: {new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Makassar'}).format(new Date(d.expires_at))} WITA</small>
          {d.active&&<ActionRow><button type="button" className="btn secondary danger-text" disabled={busy}
            onClick={()=>{if(window.confirm('Cabut akses baca perangkat Codex ini?'))void save({action:'revoke',id:d.id});}}>Cabut akses</button></ActionRow>}
        </article>)}
      {!devices.length&&<p>Belum ada perangkat yang disetujui.</p>}
    </div>
  </>;
}
