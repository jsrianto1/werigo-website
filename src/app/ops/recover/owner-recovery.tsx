'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { LanguageProvider, LanguageSelect, useLanguage } from '@/ops/ui/language';
import { LockKeyhole } from '@/ops/ui/icons';

function RecoveryForm() {
  const {language} = useLanguage();
  const l = (en: string, id: string) => language === 'en' ? en : id;
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const value = new URLSearchParams(location.hash.slice(1)).get('token') || '';
    if (location.hash) history.replaceState(null, '', '/ops/recover');
    setToken(value);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/ops/auth/recovery', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(token ? {...fields, action: 'reset', token} : {...fields, action: 'request'}),
      });
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 410) setToken('');
        throw new Error(response.status === 410
          ? l('This link is invalid, expired or already used. Request a new link.', 'Link tidak valid, sudah dipakai atau kedaluwarsa. Minta link baru.')
          : response.status === 429
            ? l('Too many requests. Try again later.', 'Terlalu banyak permintaan. Coba lagi nanti.')
            : body.error);
      }
      if (token) {
        setToken('');
        setUsername(body.username);
      } else setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : l('Try again.', 'Coba lagi.'));
    } finally {
      setBusy(false);
    }
  }

  return <main className="login-screen">
    <div className="login-top"><img src="/brand/journey-loop-v20261119/wordmark-teal.svg" alt="Werigo"/><LanguageSelect/></div>
    <section className="login-card">
      <span className="login-emblem"><LockKeyhole size={30}/></span>
      <span className="eyebrow">WERIGO OPS</span>
      <h1>{l('Recover Owner access', 'Pulihkan akses Owner')}</h1>
      {username ? <p>{l('Password updated. In Operations · username, sign in as ', 'Password sudah diubah. Pilih Operasional · username dan masuk sebagai ')}<strong>{username}</strong>.</p>
        : sent ? <p role="status">{l('If this is the registered Ops Owner email, check your inbox and spam folder for a link valid for 30 minutes.', 'Kalau ini email Owner Ops yang terdaftar, cek inbox dan folder spam. Link berlaku 30 menit.')}</p>
        : token !== null && <form key={token ? 'reset' : 'request'} onSubmit={submit}>
          {token ? <>
            <p>{l('Set a new Ops password with at least 12 characters.', 'Buat password Ops baru dengan minimal 12 karakter.')}</p>
            <label className="field"><span>{l('New password', 'Password baru')}</span><input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} required/></label>
            <label className="field"><span>{l('Confirm new password', 'Ulangi password baru')}</span><input name="confirm_password" type="password" autoComplete="new-password" minLength={12} maxLength={256} required/></label>
          </> : <>
            <p>{l('Enter the email originally registered for the Ops Owner. This does not reset the website admin password.', 'Masukkan email yang sejak awal terdaftar untuk Owner Ops. Password admin website tidak ikut berubah.')}</p>
            <label className="field"><span>{l('Ops Owner email', 'Email Owner Ops')}</span><input name="email" type="email" autoComplete="email" maxLength={254} required/></label>
          </>}
          <button className="btn primary" disabled={busy}>{busy ? l('Please wait…','Tunggu sebentar…') : token ? l('Set new password','Simpan password baru') : l('Send recovery link','Kirim link pemulihan')}</button>
        </form>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <a className="text-btn" href="/ops?connect=ops">{l('Back to Ops sign-in', 'Kembali ke login Ops')}</a>
    </section>
    <footer>WERIGO · BALI OPERATIONS</footer>
  </main>;
}

export function OwnerRecovery() {
  return <div className="werigo-ops"><LanguageProvider><RecoveryForm/></LanguageProvider></div>;
}
