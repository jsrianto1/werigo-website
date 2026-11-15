// Exercise the real hook's effect with controlled lifecycle events and delayed
// transport responses. No browser, external network or environment writes.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
let effect,latest,checks=0,sequence=0;
const intervals=new Map(),timeouts=new Map(),requests=[];
const saved=new Map(['fetch','window','document','setInterval','clearInterval','setTimeout','clearTimeout'].map(k=>[k,globalThis[k]]));
const win=new EventTarget(),doc=new EventTarget();doc.visibilityState='visible';
globalThis.window=win;globalThis.document=doc;
globalThis.setInterval=(fn,ms)=>{const id=++sequence;intervals.set(id,{fn,ms});return id;};
globalThis.clearInterval=id=>intervals.delete(id);
globalThis.setTimeout=(fn,ms)=>{const id=++sequence;timeouts.set(id,{fn,ms});return id;};
globalThis.clearTimeout=id=>timeouts.delete(id);
globalThis.__fleetHookTest={state:()=>[null,value=>{latest=value;}],effect:fn=>{effect=fn;}};
registerHooks({resolve(specifier,context,next){if(specifier==='react')return {url:'data:text/javascript,'+encodeURIComponent('export const useState=()=>globalThis.__fleetHookTest.state();export const useEffect=fn=>globalThis.__fleetHookTest.effect(fn);'),shortCircuit:true};return next(specifier,context);}});
globalThis.fetch=(url,options)=>new Promise((resolve,reject)=>{const request={url,options,resolve,reject,ignoreAbort:false};requests.push(request);options.signal.addEventListener('abort',()=>{if(!request.ignoreAbort)reject(new Error('aborted'));});});
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const respond=(request,available)=>request.resolve({ok:true,json:async()=>({ok:true,enabled:true,stock:[{model:'edpower',available}]})});
function check(value,message){assert.ok(value,message);checks++;}
try{
 const {useFleetAvailability}=await import('../src/lib/useFleetAvailability.ts');
 function RentalProbe(){useFleetAvailability('2028-03-08T09:00:00+08:00','2028-03-11T09:00:00+08:00');return null;}
 RentalProbe();
 const cleanup=effect();
 check(requests.length===1,'Mount requests live availability immediately');
 respond(requests[0],1);await settle();check(latest.stock.edpower===1,'Initial stock reaches the consumer');
 win.dispatchEvent(new Event('focus'));check(requests.length===2,'Returning to the app immediately checks stock');
 requests[1].ignoreAbort=true;
 win.dispatchEvent(new Event('focus'));respond(requests[2],0);await settle();
 respond(requests[1],1);await settle();check(latest.stock.edpower===0,'A delayed old response cannot restore a bike reserved by Ops');
 const poll=[...intervals.values()][0];check(poll.ms===15000,'A visible rental screen refreshes every15seconds');
 doc.visibilityState='hidden';const before=requests.length;poll.fn();await settle();check(requests.length===before,'Hidden app tabs do not keep polling');
 doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));check(requests.length===before+1,'Reopening a hidden PWA immediately checks stock');
 respond(requests.at(-1),1);await settle();check(latest.stock.edpower===1,'An Ops cancellation restores displayed stock');
 win.dispatchEvent(new Event('online'));check(requests.length===before+2,'Network recovery immediately checks stock');
 const deadline=[...timeouts.values()].at(-1);check(deadline.ms===12000,'Slow transport has a bounded timeout');deadline.fn();await settle();check(latest.error===true,'An unconfirmed stock response disables checkout rather than claiming availability');
 win.dispatchEvent(new Event('focus'));const pending=requests.at(-1);pending.ignoreAbort=true;const prior=latest;cleanup();respond(pending,99);await settle();check(latest===prior,'Unmount prevents any late result update');
 const after=requests.length;win.dispatchEvent(new Event('focus'));win.dispatchEvent(new Event('online'));doc.dispatchEvent(new Event('visibilitychange'));check(requests.length===after,'Unmount removes all refresh event listeners');
 check(intervals.size===0&&timeouts.size===0,'Unmount clears polling and request timers');
 check(requests.every(r=>r.options.cache==='no-store'),'All refresh requests bypass caches');
 console.log(`${checks} fleet refresh lifecycle checks passed; no browser or external requests.`);
}finally{for(const [key,value] of saved){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}delete globalThis.__fleetHookTest;}
