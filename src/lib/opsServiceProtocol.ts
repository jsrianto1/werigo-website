import {createHmac,createPrivateKey,createPublicKey,sign,verify} from 'node:crypto';
export const OPS_SERVICE_URL='https://werigo-team-ops.veyaworkspace.chatgpt.site/api/website-sync';
export const OPS_TICK_PATH='/api/integrations/ops/tick';
export function websiteSigningKey(secret:string){
 if(secret.length<32)throw new Error('Signing configuration unavailable');
 const seed=createHmac('sha256',secret).update('werigo.website.ops-signing.v1').digest();
 return createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),seed]),format:'der',type:'pkcs8'});
}
export function websitePublicKey(secret:string){return createPublicKey(websiteSigningKey(secret)).export({format:'jwk'});}
export function serviceMessage(role:string,method:string,path:string,time:string,body:string){return ['werigo-service-v1',role,method,path,time,body].join('\n');}
export function websiteServiceHeaders(secret:string,method:'GET'|'POST',body:string){
 const time=String(Date.now());
 return {'user-agent':'WerigoWebsite/1.0 (+https://werigo.co)','x-werigo-time':time,'x-werigo-alg':'Ed25519','x-werigo-signature':sign(null,Buffer.from(serviceMessage('website',method,'/api/website-sync',time,body)),websiteSigningKey(secret)).toString('base64url')};
}
export function verifyOpsServiceSignature(jwk:string,time:string,body:string,signature:string,now=Date.now()){
 if(!/^\d{13}$/.test(time)||Math.abs(now-Number(time))>300000||!/^[A-Za-z0-9_-]{86}$/.test(signature))return false;
 try{const key=JSON.parse(jwk);if(key.kty!=='OKP'||key.crv!=='Ed25519'||key.d||typeof key.x!=='string')return false;
 return verify(null,Buffer.from(serviceMessage('ops','POST',OPS_TICK_PATH,time,body)),createPublicKey({key,format:'jwk'}),Buffer.from(signature,'base64url'));
 }catch{return false;}
}
