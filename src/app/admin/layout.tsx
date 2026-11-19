import type {Metadata} from 'next';
import '../ops/ops.css';
import '@/ops/ui/workspace.css';
import '../ops/journey-loop.css';
export const metadata:Metadata={robots:{index:false,follow:false}};
export default function AdminLayout({children}:{children:React.ReactNode}){return children;}
