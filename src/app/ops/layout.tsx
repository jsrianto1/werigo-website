import type {Metadata} from 'next';
import './ops.css';
export const metadata:Metadata={title:'Werigo Ops · Bali Team',description:'Werigo staff workspace',robots:{index:false,follow:false},alternates:{canonical:'/ops'}};
export default function OpsLayout({children}:{children:React.ReactNode}){return <div className="werigo-ops">{children}</div>;}
