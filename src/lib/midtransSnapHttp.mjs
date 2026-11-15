import {request} from 'node:https';

/**
 * Snap uses HTTP407 for expiry. Fetch converts that response into a network
 * error, so read this exact provider endpoint through Node's HTTPS client.
 * @param {string} token
 * @param {boolean} production
 * @param {typeof request} transport
 * @returns {Promise<{http:number,data:Record<string,unknown>|null}>}
 */
export function readSnapSnapshot(token, production, transport=request) {
 const host=production?'app.midtrans.com':'app.sandbox.midtrans.com';
 return new Promise((resolve,reject)=>{
  const fail=()=>reject(new Error('SNAP_SNAPSHOT_REQUEST_FAILED'));
  const req=transport(new URL('https://'+host+'/snap/v1/transactions/'+encodeURIComponent(token)),{method:'GET',headers:{Accept:'application/json'}},res=>{
   const chunks=[];let bytes=0;
   res.on('error',fail);res.on('aborted',fail);
   res.on('data',chunk=>{bytes+=chunk.length;if(bytes>1048576){req.destroy();fail();}else chunks.push(chunk);});
   res.on('end',()=>{
    let data=null;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{}
    resolve({http:res.statusCode??0,data:data&&typeof data==='object'&&!Array.isArray(data)?data:null});
   });
  });
  req.on('error',fail);
  req.setTimeout(15000,()=>{req.destroy();fail();});
  req.end();
 });
}
