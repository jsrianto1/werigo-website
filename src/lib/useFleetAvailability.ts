'use client';
import {useEffect,useState} from 'react';
export function useFleetAvailability(start:string,end:string){
 const [result,setResult]=useState<{key:string;enabled:boolean;stock:Record<string,number>;error:boolean}|null>(null);
 const key=start+'|'+end;
 useEffect(()=>{
  if(!start||!end||!Number.isFinite(Date.parse(start))||Date.parse(end)-Date.parse(start)<2*86400000)return;
  const controller=new AbortController();
  async function load(){try{
   const response=await fetch('/api/fleet/availability?'+new URLSearchParams({start,end}),{signal:controller.signal,cache:'no-store'});
   const data=await response.json();if(!response.ok||!data.ok)throw new Error();
   setResult({key,enabled:!!data.enabled,stock:Object.fromEntries((data.stock||[]).map((r:{model:string;available:number})=>[r.model,r.available])),error:false});
  }catch{if(!controller.signal.aborted)setResult({key,enabled:true,stock:{},error:true});}}
  void load();const timer=setInterval(()=>void load(),30000);
  return()=>{controller.abort();clearInterval(timer);};
 },[start,end,key]);
 return result?.key===key?result:null;
}
