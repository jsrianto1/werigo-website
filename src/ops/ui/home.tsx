import { currentStaff,AppError } from '@/ops/lib/server';
import {Login} from './login';
import OpsApp from "./ops-app";
import { LanguageProvider } from "./language";
import {opsReady} from '@/ops/lib/database';
export const dynamic="force-dynamic";
export default async function Home(){
 if(!await opsReady())return <main className="login-screen"><section className="login-card"><span className="eyebrow">WERIGO OPS</span><h1>Your workspace is moving here.</h1><p>We are verifying your team records before opening Ops. Please use your current workspace until the move is confirmed.</p></section></main>;
 let member;
 try{member=await currentStaff();}catch(e){if(!(e instanceof AppError)||![401,403].includes(e.status))throw e;}
 return <LanguageProvider>{member?<OpsApp displayName={member.name}/>:<Login/>}</LanguageProvider>;
}
