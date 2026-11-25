'use client';

import {useEffect, useRef, useState, type FormEvent} from 'react';
import {dualPasswordMin, dualPasswordMax, dualPasswordRange} from '@/ops/lib/dual-identity';

type Invite = {username: string; role: string; website_role: string};

export function DualActivation() {
  const token = useRef<string|null>(null);
  const [invite, setInvite] = useState<Invite|null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  useEffect(()=>{
    if(token.current === null) {
      token.current = new URLSearchParams(location.hash.slice(1)).get('token') || '';
      if(location.hash) history.replaceState(null, '', '/ops/dual-activate');
    }
    const controller = new AbortController();
    void fetch('/api/ops/auth/dual-activate', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, signal: controller.signal,
      body: JSON.stringify({action: 'inspect', token: token.current}),
    }).then(async r => {
      const data = await r.json();
      if(!r.ok) throw new Error(data.error);
      setInvite(data);
    }).catch(e => {if (!controller.signal.aborted) setError(e.message);});
    return () => controller.abort();
  },[]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form=event.currentTarget;
    const fields=Object.fromEntries(new FormData(form));
    setError('');
    setBusy(true);
    try {
      const r=await fetch('/api/ops/auth/dual-activate',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({...fields,action:'activate',token:token.current}),
      });
      const data=await r.json();
      if(!r.ok) {
        if (r.status===410) setInvite(null);
        throw new Error(data.error);
      }
      form.reset();
      token.current='';
      setDone(data.username);
    } catch(e) {setError(e instanceof Error ? e.message : 'Tidak bisa mengaktifkan akun.');}
    finally {setBusy(false);}
  }

  return <div className="werigo-ops"><main className="login-screen"><section className="login-card">
    <span className="eyebrow">WERIGO WORKSPACE</span>
    <h1>{done?'Akun siap dipakai':'Aktifkan akun dua akses'}</h1>
    {done?<p>Masuk dengan username <strong>{done}</strong> dan password baru untuk mengakses Ops dan admin website.</p>
    :invite?<><p>Username: <strong>{invite.username}</strong> · {invite.website_role==='super_admin'?'Owner Ops + Super Admin website':'Ops + Admin website'}</p>
      <form onSubmit={submit}>
        <label className="field"><span>Password baru · {dualPasswordRange} karakter</span><input type="password" name="password" autoComplete="new-password" required minLength={dualPasswordMin} maxLength={dualPasswordMax}/></label>
        <label className="field"><span>Ulangi password</span><input type="password" name="confirm_password" autoComplete="new-password" required minLength={dualPasswordMin} maxLength={dualPasswordMax}/></label>
        <button className="btn primary" disabled={busy}>{busy?'Mengaktifkan…':'Aktifkan akun'}</button>
      </form>
    </>: !error&&<p>Memeriksa link aktivasi…</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <a className={done?'btn primary':'text-btn'} href="/ops?connect=ops">Ke login Werigo Ops</a>
  </section></main></div>;
}
