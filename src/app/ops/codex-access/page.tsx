import type {Metadata} from 'next';
import {ActionRow} from '@/components/ui/ActionRow';
import {codexAccessOwner,listCodexReadDevices} from '@/lib/werigo-read-admin';
import {CodexDevices} from './codex-devices';

export const metadata:Metadata={title:'Akses Codex · Werigo',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function Page() {
  const owner=await codexAccessOwner();
  return <div className="werigo-ops"><main className="login-screen"><section className="login-card workspace-dual-card">
    <span className="eyebrow">WERIGO OPS</span>
    <h1>Akses Codex Werigo</h1>
    {!owner ? <>
      <p>Pengaturan ini hanya untuk Owner Ops asli dengan akun Super Admin website yang tersambung. Akun dua akses seperti ghost tidak bisa membuat kunci perangkat.</p>
      <ActionRow>
        <a className="btn primary" href="/ops">Ke Werigo Ops</a>
        <a className="text-btn" href="/ops?connect=website">Sambungkan Super Admin website</a>
      </ActionRow>
    </> : <>
      <p>Perangkat yang disetujui bisa membaca booking, ketersediaan stok, dan status rental Werigo. Akses ini tidak bisa login ke dashboard, membaca kontak pelanggan, atau mengubah data.</p>
      <p>Jika sesi Super Admin sudah lewat 15 menit, <a className="text-btn" href="/ops?connect=website">masuk ulang sebagai Super Admin website</a> sebelum menyetujui perangkat.</p>
      <CodexDevices devices={(await listCodexReadDevices()).map(d=>({...d,expires_at:new Date(d.expires_at).toISOString(),revoked_at:d.revoked_at?new Date(d.revoked_at).toISOString():null}))}/>
      <p><a className="text-btn" href="/ops?view=settings">Kembali ke User &amp; akses</a></p>
    </>}
  </section></main></div>;
}
