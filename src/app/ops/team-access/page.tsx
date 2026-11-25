import type {Metadata} from 'next';
import {getAdmin, canManageDualAccounts} from '@/lib/adminAuth';
import {optionalOpsMember} from '@/ops/lib/workspace-context';
import {opsDatabase} from '@/ops/lib/database';
import {websiteRoleForDualMember} from '@/ops/lib/dual-identity';
import {DualAccounts, type DualAccount} from './dual-accounts';

export const metadata: Metadata = {title: 'Undangan Ops dan website', robots: {index: false, follow: false}};
export const dynamic = 'force-dynamic';

export default async function Page() {
  const [ops, admin] = await Promise.all([optionalOpsMember(), getAdmin()]);
  if (!ops || !canManageDualAccounts(ops.role, admin)) {
    return <div className="werigo-ops"><main className="login-screen"><section className="login-card">
      <span className="eyebrow">WERIGO WORKSPACE</span><h1>Akses Owner dibutuhkan</h1>
      <p>Untuk mengundang akun dua akses, masuk sebagai Owner Ops dan sambungkan sesi Super Admin website yang aktif.</p>
      <a className="btn primary" href="/ops">Ke Werigo Ops</a>
      {ops?.role === 'owner' && !admin && <a className="text-btn" href="/ops?connect=website">Sambungkan Super Admin website</a>}
      {admin?.role === 'super_admin' && !ops && <a className="text-btn" href="/ops?connect=ops">Sambungkan Owner Ops</a>}
    </section></main></div>;
  }
  const rows = await opsDatabase().prepare(
    "SELECT s.id,s.email,s.name,s.role,s.enabled,a.username,CASE WHEN a.password_hash='!pending' THEN 1 ELSE 0 END AS pending FROM staff s JOIN auth_accounts a ON a.staff_id=s.id WHERE s.id LIKE 'dual:%' ORDER BY s.created_at DESC"
  ).all<DualAccount & {email: string}>();
  const accounts = rows.results.flatMap(({email, ...row}) => {
    const websiteRole = websiteRoleForDualMember({...row,email});
    return websiteRole ? [{...row, websiteRole}] : [];
  });
  return <DualAccounts accounts={accounts} ownId={ops.id} usesWebsiteEmail={admin?.provider === 'email'} />;
}
