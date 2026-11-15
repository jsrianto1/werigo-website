'use client';
import {usePathname} from 'next/navigation';
export function HideOnOps({children}:{children:React.ReactNode}){const path=usePathname();return path==='/ops'||path.startsWith('/ops/')?null:<>{children}</>;}
