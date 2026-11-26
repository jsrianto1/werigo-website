import type {Metadata} from 'next';
import './ops.css';
import '@/ops/ui/workspace.css';
import './journey-loop.css';
import './action-spacing.css';
export const metadata:Metadata={title:'Werigo Workspace · Bali Team',description:'Werigo staff workspace',robots:{index:false,follow:false},alternates:{canonical:'/ops'},manifest:'/ops/manifest.webmanifest',appleWebApp:{capable:true,title:'Werigo Ops',statusBarStyle:'default'},icons:{apple:'/brand/journey-loop-v20261119/icon-192.png',icon:'/brand/journey-loop-v20261119/icon-192.png'}};
export default function OpsLayout({children}:{children:React.ReactNode}){return children;}
