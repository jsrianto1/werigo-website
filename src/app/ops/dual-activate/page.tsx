import type {Metadata} from 'next';
import {DualActivation} from './dual-activation';

export const metadata: Metadata = {
  title: 'Aktivasi akun Werigo', robots: {index: false, follow: false}, referrer: 'no-referrer',
};
export default function Page() { return <DualActivation/>; }
