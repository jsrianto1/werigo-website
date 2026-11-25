"use client";
import {useState} from 'react';
import {authClient} from '@/lib/auth-client';
import {Bike,LockKeyhole,ArrowRight,LoaderCircle} from './icons';
import {useLanguage,LanguageSelect} from './language';

export function Login({initialMode='ops',connecting=false}:{initialMode?:'ops'|'website';connecting?:boolean}){
 const {language}=useLanguage(),l=(en:string,id:string)=>language==='en'?en:id;
 const [mode,setMode]=useState(initialMode),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError('');
  const d=Object.fromEntries(new FormData(e.currentTarget));
  try{
   if(mode==='website'){
    const signed=await authClient.signIn.email({email:String(d.identity),password:String(d.password)});
    if(signed.error)throw new Error(l('Sign-in failed. Check your email and password.','Login gagal. Periksa email dan password.'));
    const check=await fetch('/api/admin/me',{cache:'no-store'});
    if([401,403].includes(check.status)){await authClient.signOut();throw new Error(l('This account does not have website admin access.','Akun ini tidak memiliki akses admin website.'));}
    if(!check.ok)throw new Error(l('Could not verify website access. Please retry.','Akses website belum bisa diverifikasi. Coba lagi.'));
   }else{
    const r=await fetch('/api/ops/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:d.identity,password:d.password})});
    const j=await r.json();if(!r.ok)throw new Error(j.error);
   }
   location.assign('/ops');
  }catch(err){setError((err as Error).message);setBusy(false);}
 }
 return <main className="login-screen"><div className="login-top"><img src="/brand/journey-loop-v20261119/wordmark-teal.svg" alt="Werigo"/><LanguageSelect/></div><section className="login-card"><span className="login-emblem"><Bike size={30}/></span><span className="eyebrow">WERIGO WORKSPACE</span><h1>{connecting?l('Connect your access','Sambungkan aksesmu'):l('Welcome to your workspace','Selamat datang di ruang kerja tim')}</h1><p>{l('Rental operations, website content and rewards. Your existing account permissions stay in place.','Operasional rental, konten website dan rewards. Hak akses akunmu tetap berlaku.')}</p>
 {!connecting&&<div className="workspace-login-options" aria-label={l('Account type','Jenis akun')}><button type="button" aria-pressed={mode==='ops'} onClick={()=>{setMode('ops');setError('');}}>{l('Operations · username','Operasional · username')}</button><button type="button" aria-pressed={mode==='website'} onClick={()=>{setMode('website');setError('');}}>{l('Website admin · email','Admin website · email')}</button></div>}
 {connecting&&<p>{l('This adds your existing access in this browser. It does not merge accounts or grant additional permissions.','Ini menambahkan akses akun yang sudah ada di browser ini. Akun dan hak akses tidak berubah.')}</p>}
 <form key={mode} onSubmit={submit}><label className="field"><span>{mode==='website'?'Email':'Username'}</span><input name="identity" type={mode==='website'?'email':'text'} autoComplete="username" autoCapitalize="none" spellCheck={false} minLength={mode==='ops'?3:undefined} maxLength={mode==='ops'?24:254} required/></label><label className="field"><span>Password</span><input type="password" name="password" autoComplete="current-password" minLength={mode==='ops'?4:undefined} required/></label>{error&&<div className="form-error" role="alert">{error}</div>}<button className="btn primary" disabled={busy}>{busy?<LoaderCircle size={17} className="spin"/>:<LockKeyhole size={17}/>} {l('Sign in','Masuk')}<ArrowRight size={16}/></button></form><small>{l('Use your existing Ops username or website admin email. Ask the Owner if you need access.','Gunakan username Ops atau email admin website yang sudah ada. Hubungi Owner jika membutuhkan akses.')}</small><a className="text-btn" href={mode==='ops'?'/ops/recover':'/account/forgot-password'}>{mode==='ops'?l('Recover Ops Owner access','Pulihkan akses Owner Ops'):l('Forgot website admin password?','Lupa password admin website?')}</a>{connecting&&<a className="text-btn" href="/ops">{l('Back to workspace','Kembali ke workspace')}</a>}</section><footer>WERIGO · BALI WORKSPACE</footer></main>;
}
