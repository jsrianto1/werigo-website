'use client';

import {useState, type FormEvent} from 'react';
import {useRouter} from 'next/navigation';

export type DualAccount = {
  id: string; name: string; username: string; role: string; enabled: number; pending: number; websiteRole?: string;
};
type Command = {action: 'create'} | {action: 'reissue'|'disable'; id: string; username: string};
type Invite = {activation_url: string; username: string; expires_at: number};
const roleName: Record<string, string> = {ops: 'Staff', finance: 'Finance', manager: 'Admin Ops', owner: 'Owner Ops'};

export function DualAccounts({accounts, ownId, usesWebsiteEmail}: {accounts: DualAccount[]; ownId: string; usesWebsiteEmail: boolean}) {
  const router = useRouter();
  const [command, setCommand] = useState<Command>({action: 'create'});
  const [invite, setInvite] = useState<Invite|null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError('');
    setMessage('');
    setInvite(null);
    try {
      const r = await fetch('/api/ops/auth/dual-invite',{method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...fields,...command,username: command.action === 'create' ? fields.username : command.username})});
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      form.reset();
      setCommand({action: 'create'});
      if (data.invitation) setInvite(data.invitation);
      else setMessage('Akses kedua sisi dan semua sesi akun tersebut sudah dicabut.');
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Tidak bisa menyimpan.'); }
    finally { const field=form.elements.namedItem('current_password'); if (field instanceof HTMLInputElement) field.value=''; setBusy(false); }
  }

  return <div className="werigo-ops"><main className="login-screen"><section className="login-card workspace-dual-card">
    <span className="eyebrow">WERIGO WORKSPACE</span><h1>Undang akun dua akses</h1>
    <p>Satu username untuk Ops dan admin website. Tidak perlu email. Pilih peran dengan sengaja: Admin website bisa mengakses data pelanggan dan operasional website.</p>
    {usesWebsiteEmail&&<p>Kalau sesi admin website lebih dari 15 menit, <a className="text-btn" href="/ops?connect=website">masuk ulang sebagai Super Admin website</a> sebelum membuat link.</p>}
    <p>Untuk undangan Ops saja, pakai <a className="text-btn" href="/ops?view=settings">User &amp; akses</a>.</p>
    {invite && <div className="panel detail-content">
      <h2>Link aktivasi untuk {invite.username}</h2>
      <p>Berlaku sekali selama satu jam. Kirim hanya lewat jalur pribadi ke pemilik akun. Jangan tempel link di chat publik.</p>
      <label className="field"><span>Link aktivasi</span><input value={invite.activation_url} readOnly onFocus={e=>e.currentTarget.select()}/></label>
      <button type="button" className="btn secondary" onClick={async()=>{try{await navigator.clipboard.writeText(invite.activation_url);setMessage('Link disalin.');}catch{setMessage('Pilih dan salin link di atas.');}}}>Salin link</button>
      <button type="button" className="text-btn" onClick={()=>setInvite(null)}>Tutup link</button>
    </div>}
    <form onSubmit={save} key={command.action === 'create' ? 'create' : command.action+command.id}>
      {command.action === 'create' ? <>
        <label className="field"><span>Nama</span><input name="name" required maxLength={100}/></label>
        <label className="field"><span>Username</span><input name="username" required minLength={3} maxLength={24} autoCapitalize="none" autoComplete="off"/></label>
        <label className="field"><span>Peran di dua sisi</span><select name="role" defaultValue="ops">
          <option value="ops">Staff Ops + Admin website</option>
          <option value="finance">Finance Ops + Admin website</option>
          <option value="manager">Admin Ops + Admin website</option>
          <option value="owner">Owner Ops + Super Admin website</option>
        </select></label>
      </> : <p>{command.action === 'disable' ? 'Cabut akses kedua sisi untuk ' : 'Akhiri sesi lama dan buat link aktivasi baru untuk '}<strong>{command.username}</strong>.</p>}
      <label className="field"><span>Konfirmasi password Ops lo</span><input type="password" name="current_password" autoComplete="current-password" required maxLength={1024}/></label>
      <button className="btn primary" disabled={busy}>{busy ? 'Menyimpan…' : command.action === 'disable' ? 'Cabut akses' : 'Buat link aktivasi'}</button>
      {command.action !== 'create' && <button type="button" className="text-btn" onClick={()=>setCommand({action:'create'})}>Batal</button>}
    </form>
    {error && <p role="alert" className="form-error">{error}</p>}
    {message && <p role="status">{message}</p>}
    <h2>Akun dua akses</h2>
    {!accounts.length && <p>Belum ada akun dua akses.</p>}
    {accounts.map(account=><div className="panel detail-content" key={account.id}>
      <strong>{account.name} · {account.username}</strong>
      <p>{roleName[account.role]} + {account.websiteRole === 'super_admin' ? 'Super Admin' : 'Admin'} website · {account.enabled ? account.pending ? 'Menunggu aktivasi' : 'Aktif' : 'Nonaktif'}</p>
      {ownId!==account.id && <>
        <button type="button" className="text-btn" disabled={busy} onClick={()=>setCommand({action:'reissue',id:account.id,username:account.username})}>{account.enabled ? 'Buat ulang link' : 'Aktifkan ulang dengan link'}</button>
        {!!account.enabled && <button type="button" className="text-btn" disabled={busy} onClick={()=>setCommand({action:'disable',id:account.id,username:account.username})}>Cabut akses</button>}
      </>}
    </div>)}
    <a className="text-btn" href="/ops?view=settings">Kembali ke User &amp; akses</a>
  </section></main></div>;
}
