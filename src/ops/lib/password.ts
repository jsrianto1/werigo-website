const encoder=new TextEncoder();
export function usernameValue(v:unknown){const s=String(v??'').trim().toLowerCase();if(!/^[a-z0-9][a-z0-9_.-]{2,23}$/.test(s))throw new Error('Username must be 3–24 letters, numbers, dots, hyphens or underscores.');return s;}
export function passwordValue(v:unknown){if(typeof v!=='string'||Array.from(v).length<4||!v.trim())throw new Error('Password must contain at least 4 characters.');return v;}
const base64=(b:Uint8Array)=>btoa(String.fromCharCode(...b));
const unbase64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export async function sha256(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(s))),b=>b.toString(16).padStart(2,'0')).join('');}
async function derive(password:string,salt:Uint8Array){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:salt as BufferSource,iterations:100000},key,256));}
export async function passwordHash(password:string){passwordValue(password);const salt=crypto.getRandomValues(new Uint8Array(16));return `pbkdf2-sha256$100000$${base64(salt)}$${base64(await derive(password,salt))}`;}
export const DUMMY_HASH='pbkdf2-sha256$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
export async function passwordMatches(password:string,hash:string){try{const [algorithm,iterations,saltText,expectedText,...extra]=hash.split('$');if(algorithm!=='pbkdf2-sha256'||iterations!=='100000'||extra.length)return false;const salt=unbase64(saltText),expected=unbase64(expectedText);if(salt.length!==16||expected.length!==32)return false;const actual=await derive(password,salt);let diff=0;for(let i=0;i<32;i++)diff|=actual[i]^expected[i];return diff===0;}catch{return false;}}
export const sessionToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
