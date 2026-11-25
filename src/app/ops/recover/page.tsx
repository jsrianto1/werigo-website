import type { Metadata } from 'next';
import { OwnerRecovery } from './owner-recovery';

export const metadata: Metadata = {
  title: 'Werigo Ops · Owner recovery',
  robots: {index: false, follow: false},
  referrer: 'no-referrer',
};

export default function RecoveryPage() {
  return <OwnerRecovery />;
}
