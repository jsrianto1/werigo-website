import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {AsyncLocalStorage} from 'node:async_hooks';
import {PGlite} from '@electric-sql/pglite';
import ts from 'typescript';
import {compileOpsSql} from '../src/ops/lib/sql.ts';

// Real application handlers and Ops SQL against isolated PostgreSQL/WASM.
// The Next request context, connection adapter and SMTP transport are local doubles.
const pg = new PGlite();
for (const file of readdirSync('db/migrations').filter(f=>f.endsWith('.sql')).sort()) {
  await pg.exec('BEGIN;'+readFileSync('db/migrations/'+file,'utf8')+'COMMIT;');
}
await pg.exec('SET search_path=ops,public');
let tail = Promise.resolve();
function batch(statements) {
  const result = tail.then(()=>pg.transaction(async tx=>{
    let changes=0;
    const results=[];
    for(const {sql,values} of statements) {
      const res=await tx.query(compileOpsSql(sql,values,changes),values);
      changes=res.affectedRows||0;
      results.push({results:res.rows,meta:{changes}});
    }
    return results;
  }));
  tail=result.catch(()=>{});
  return result;
}
function prepare(sql, values=[]) {
  const statement={sql,values,bind:(...v)=>prepare(sql,v)};
  statement.run=statement.all=async()=>(await batch([statement]))[0];
  statement.first=async(column)=>{const row=(await statement.all()).results[0];return row?(column?row[column]:row):null;};
  return statement;
}

const ctx = new AsyncLocalStorage();
const mail=[], jobs=[], require=createRequire(import.meta.url), modules=new Map();
const stubs={
  'next/headers':{headers:async()=>ctx.getStore()},
  'next/server':{after:fn=>jobs.push(fn)},
  '@/ops/lib/database':{opsDatabase:()=>({prepare,batch})},
  '@/lib/mailer':{isMailConfigured:()=>true,sendOpsRecoveryEmail:async(to,link)=>mail.push({to,link})},
};
function load(path) {
  path=resolve(path);
  if(modules.has(path))return modules.get(path).exports;
  const mod={exports:{}};modules.set(path,mod);
  const source=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  function lookup(id) {
    if(id in stubs)return stubs[id];
    const local=id.startsWith('@/')?resolve('src',id.slice(2)):id.startsWith('.')?resolve(dirname(path),id):null;
    if(local) {
      const file=['.ts','.tsx'].map(ext=>local+ext).find(existsSync);
      if(file===resolve('src/ops/lib/database.ts'))return stubs['@/ops/lib/database'];
      if(file)return load(file);
    }
    return require(id);
  }
  new Function('require','module','exports',source)(lookup,mod,mod.exports);
  return mod.exports;
}

const old='Initial-Fixture-Password';
const changed='Updated-Fixture-Password';
const {passwordHash,sha256}=load('src/ops/lib/password.ts');
const accountHash=await passwordHash(old);
for(const [id,username,role,email,enabled] of [
  ['o','fixture-owner','owner','ops-owner@example.invalid',1],
  ['m','fixture-manager','manager','user:m',1],
  ['s','fixture-staff','ops','user:s',1],
  ['f','fixture-finance','finance','finance@example.invalid',1],
  ['d','fixture-disabled','owner','ops-disabled@example.invalid',0],
]){
  // Fixtures only: do not use production identities, tokens or password hashes.
  await pg.query('INSERT INTO staff(id,name,role,email,enabled,created_at) VALUES($1,$2,$3,$4,$5,$6)',[id,username,role,email,enabled,1]);
  await pg.query('INSERT INTO auth_accounts(staff_id,username,password_hash,updated_at) VALUES($1,$2,$3,1)',[id,username,accountHash]);
}
const route=name=>load(`src/app/api/ops/${name}/route.ts`);
const origin=new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').origin;
let checks=0;
async function request(name, body, cookie='', requestOrigin=origin) {
  const req=new Request(origin+'/api/ops/'+name,{
    method:body===undefined?'GET':'POST',headers:{Origin:requestOrigin,Cookie:cookie,'Content-Type':'application/json'},
    body:body===undefined?undefined:JSON.stringify(body),
  });
  return ctx.run(req.headers,()=>body===undefined?route(name).GET(req):route(name).POST(req));
}
const status=(res,code)=>{assert.equal(res.status,code);checks++;};
async function login(username,password=old,code=200) {
  const result=await request('auth/login',{username,password});
  status(result,code);
  return result.headers.getSetCookie()[0]?.split(';')[0];
}
async function staff(cookie, data, code, action='saveStaff') {
  const result=await request('data',{action,data},cookie);
  status(result,code);
  return result.json();
}
async function recover(body,code=202,requestOrigin=origin) {
  const res=await request('auth/recovery',body,'',requestOrigin);
  status(res,code);
  for(const job of jobs.splice(0))await job();
  return res.json();
}

const owner=await login('fixture-owner'), manager=await login('fixture-manager'), oldStaff=await login('fixture-staff'), finance=await login('fixture-finance');
const add={name:'New Staff Fixture',username:'fixture-new-staff',role:'ops',enabled:true};
await staff('',add,401);
await staff(oldStaff,add,403);
await staff(finance,add,403);
await staff(manager,{...add,role:'owner'},403);
await staff(manager,{...add,role:'manager'},403);
await staff(manager,{...add,role:'finance'},403);
await staff(manager,{...add,id:'s'},403);
await staff(manager,{id:'s'},403,'staffInvite');
await staff(manager,{...add,enabled:false},403);
const invite=await staff(manager,add,200);
const ownerInvite=await staff(owner,{...add,username:'fixture-new-finance',role:'finance'},200);
assert.equal(ownerInvite.invitation.username,'fixture-new-finance');checks++;
assert.equal((await pg.query('SELECT email FROM staff WHERE id=$1',[invite.id])).rows[0].email,'user:'+invite.id);checks++;
assert.ok(!(await (await request('data',undefined,manager)).json()).staff);checks++;
assert.ok((await (await request('data',undefined,owner)).json()).staff.some(s=>s.id===invite.id));checks++;
await login(add.username,old,401);
const staffToken=new URL(invite.invitation.activation_url).searchParams.get('token');
const activation={token:staffToken,password:changed,confirm_password:changed};
await recover({...activation,action:'reset'},410);
status(await request('auth/activate',activation),200);
status(await request('auth/activate',activation),410);
const newStaff=await login(add.username,changed);
assert.equal((await (await request('data',undefined,newStaff)).json()).member.role,'ops');checks++;
await staff(newStaff,add,403);

const recovery={action:'request',email:'ops-owner@example.invalid'};
await recover(recovery,403,'https://other.example.invalid');
for (const email of ['unknown@example.invalid','finance@example.invalid','ops-disabled@example.invalid']) {
  assert.deepEqual(await recover({...recovery,email}),{ok:true});checks++;
}
assert.equal(mail.length,0);checks++;
assert.deepEqual(await recover(recovery),{ok:true});checks++;
assert.deepEqual(await recover(recovery),{ok:true});checks++;
assert.equal(mail.length,1);checks++;
assert.equal(mail[0].to,recovery.email);checks++;
const url=new URL(mail[0].link);
assert.equal(url.pathname,'/ops/recover');assert.equal(url.search,'');checks++;
const token=new URLSearchParams(url.hash.slice(1)).get('token');
const reset={action:'reset',token,password:changed,confirm_password:changed};
status(await request('auth/activate',{...activation,token}),410);
await recover({...reset,password:'too-short',confirm_password:'too-short'},400);
await recover({...reset,confirm_password:old},400);
const expired='a'.repeat(64);
await pg.query('INSERT INTO auth_invites(id,staff_id,created_at,expires_at) VALUES($1,$2,$3,$4)',[await sha256('ops-owner-recovery:'+expired),'o',1,2]);
await recover({...reset,token:expired},410);
assert.equal((await recover(reset,200)).username,'fixture-owner');checks++;
await recover(reset,410);
status(await request('data',undefined,owner),401);
await login('fixture-owner',old,401);
const newOwner=await login('fixture-owner',changed);
assert.equal((await (await request('data',undefined,newOwner)).json()).member.role,'owner');checks++;
status(await request('data',undefined,oldStaff),200);
status(await request('data',undefined,manager),200);
await login('fixture-staff');
assert.equal((await pg.query("SELECT count(*)::int AS n FROM audit WHERE action='auth.owner_recovered'")).rows[0].n,1);checks++;
await pg.close();
console.log(`${checks} Ops recovery, email-free onboarding, legacy sign-in and authorization checks passed (local PostgreSQL and test mailbox).`);
