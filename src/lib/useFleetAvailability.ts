'use client';
import {useEffect,useState} from 'react';
export function useFleetAvailability(start:string,end:string){
 const [result,setResult]=useState<{key:string;enabled:boolean;stock:Record<string,number>;error:boolean}|null>(null);
 const key=start+'|'+end;
 useEffect(()=>{
  const a=Date.parse(start),b=Date.parse(end);
  if(!start||!end||!Number.isFinite(a)||!Number.isFinite(b)||Math.ceil((b-a)/86400000)<2)return;
  let active=true,controller:AbortController|null=null;
  async function load(){
   if(document.visibilityState==='hidden')return;
   controller?.abort();const request=new AbortController();controller=request;
   let timedOut=false;
   const deadline=setTimeout(()=>{timedOut=true;request.abort();},12000);
   try{
    const response=await fetch('/api/fleet/availability?'+new URLSearchParams({start,end}),{signal:request.signal,cache:'no-store'});
    const data=await response.json();if(!response.ok||!data.ok)throw new Error();
    if(active&&controller===request&&!request.signal.aborted)setResult({key,enabled:!!data.enabled,stock:Object.fromEntries((data.stock||[]).map((r:{model:string;available:number})=>[r.model,r.available])),error:false});
   }catch{
    if(active&&controller===request&&(!request.signal.aborted||timedOut))setResult({key,enabled:true,stock:{},error:true});
   }finally{clearTimeout(deadline);}
  }
  const refresh=()=>void load();
  refresh();const timer=setInterval(refresh,15000);
  window.addEventListener('focus',refresh);window.addEventListener('online',refresh);
  document.addEventListener('visibilitychange',refresh);
  return()=>{active=false;controller?.abort();clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[start,end,key]);
 return result?.key===key?result:null;
}
