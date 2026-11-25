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
  'server-only':{},
  '@/lib/auth':{
    STAFF_ROLES:['admin','super_admin'],
    auth:{api:{getSession:async()=>{
      const mode=ctx.getStore()?.get('x-test-email-admin');
      if(!mode)return null;
      return {user:{id:'legacy-admin',email:'legacy-admin@example.invalid',name:'Legacy Admin',
        role:mode==='regular'?'admin':'super_admin',mustChangePassword:mode==='forced',banned:mode==='banned'},
        session:{createdAt:new Date(Date.now()-(mode==='stale'?30*60_000:0)),impersonatedBy:mode==='impersonated'?'another-admin':null}};
    }}},
  },
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
async function request(name, body, cookie='', requestOrigin=origin, emailAdmin='') {
  const req=new Request(origin+'/api/ops/'+name,{
    method:body===undefined?'GET':'POST',headers:{Origin:requestOrigin,Cookie:cookie,'Content-Type':'application/json','x-test-email-admin':emailAdmin},
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

// Paired identity is issued only with both privileges plus password step-up.
// A browser supplies no website entitlement; the server derives it from the
// immutable workspace principal and active Ops session.
const inviteDual=(body,cookie,emailAdmin='',from=origin)=>request('auth/dual-invite',body,cookie,from,emailAdmin);
const resolveAdmin=(cookie='',emailAdmin='')=>ctx.run(new Headers({Cookie:cookie,'x-test-email-admin':emailAdmin}),load('src/lib/adminAuth.ts').getAdmin);
const newDual={action:'create',name:'Fixture workspace Owner',username:'fixture-dual-owner',role:'owner',current_password:changed};
status(await inviteDual(newDual,'','fresh'),401);
status(await inviteDual(newDual,newOwner),403);
status(await inviteDual(newDual,manager,'fresh'),403);
for(const mode of ['regular','impersonated','forced','stale','banned'])status(await inviteDual(newDual,newOwner,mode),403);
status(await inviteDual(newDual,newOwner,'fresh','https://other.example.invalid'),403);
status(await inviteDual({...newDual,current_password:'wrong-fixture-password'},newOwner,'fresh'),401);
const issued=await inviteDual(newDual,newOwner,'fresh');
status(issued,200);
const dualLink=(await issued.json()).invitation.activation_url;
const tokenOf=link=>new URLSearchParams(new URL(link).hash.slice(1)).get('token');
assert.equal(new URL(dualLink).pathname,'/ops/dual-activate');assert.equal(new URL(dualLink).search,'');checks++;
const dualToken=tokenOf(dualLink);
const dualActivate=(body)=>request('auth/dual-activate',body);
const peek=await dualActivate({action:'inspect',token:dualToken});status(peek,200);
assert.equal((await peek.json()).website_role,'super_admin');checks++;
await login(newDual.username,changed,401);
status(await request('auth/activate',{...activation,token:dualToken}),410);
await recover({...reset,token:dualToken},410);
const safePassword='Workspace-Test-Passphrase';
const useDual={action:'activate',token:dualToken,password:safePassword,confirm_password:safePassword};
status(await dualActivate({...useDual,password:'too-short',confirm_password:'too-short'}),400);
status(await dualActivate(useDual),200);
status(await dualActivate(useDual),410);
const pairedOwner=await login(newDual.username,safePassword);
const websiteOwner=await resolveAdmin(pairedOwner);
assert.equal(websiteOwner.role,'super_admin');assert.equal(websiteOwner.provider,'workspace');checks++;
assert.equal((await (await request('data',undefined,pairedOwner)).json()).member.role,'owner');checks++;
assert.equal(await resolveAdmin(oldStaff),null);checks++;
assert.equal((await resolveAdmin('', 'fresh')).provider,'email');checks++;
assert.equal((await resolveAdmin(pairedOwner,'regular')).id,websiteOwner.id);checks++;
status(await request('auth/account',{username:newDual.username,current_password:safePassword,password:'too-short'},pairedOwner),400);
status(await inviteDual({action:'disable',id:websiteOwner.id,current_password:safePassword},pairedOwner),403);
const pairedInvite=await inviteDual({...newDual,username:'fixture-dual-staff',role:'ops',current_password:safePassword},pairedOwner);
status(pairedInvite,200);
const staffDualToken=tokenOf((await pairedInvite.json()).invitation.activation_url);
status(await dualActivate({...useDual,token:staffDualToken}),200);
const pairedStaff=await login('fixture-dual-staff',safePassword);
const websiteStaff=await resolveAdmin(pairedStaff);
assert.equal(websiteStaff.role,'admin');checks++;
assert.equal((await (await request('data',undefined,pairedStaff)).json()).member.role,'ops');checks++;
status(await inviteDual({...newDual,current_password:safePassword},pairedStaff,'fresh'),403);
await staff(pairedOwner,{...add,id:websiteStaff.id},403);
const rotated='Workspace-Test-Rotated-Passphrase';
status(await request('auth/account',{username:'fixture-dual-staff',current_password:safePassword,password:rotated},pairedStaff),200);
assert.equal(await resolveAdmin(pairedStaff),null);checks++;
await login('fixture-dual-staff',safePassword,401);
const rotatedStaff=await login('fixture-dual-staff',rotated);
assert.equal((await resolveAdmin(rotatedStaff)).role,'admin');checks++;
const resetPaired=await inviteDual({action:'reissue',id:websiteStaff.id,current_password:safePassword},pairedOwner);
status(resetPaired,200);
assert.equal(await resolveAdmin(rotatedStaff),null);checks++;
const newActivation=tokenOf((await resetPaired.json()).invitation.activation_url);
const revoked=await inviteDual({action:'disable',id:websiteStaff.id,current_password:safePassword},pairedOwner);
status(revoked,200);
status(await dualActivate({...useDual,token:newActivation}),410);
assert.equal(await resolveAdmin(pairedStaff),null);checks++;
assert.equal(Number((await pg.query("select count(*) n from public.audit_log where action like 'workspace.staff.%'")).rows[0].n),4);checks++;

await pg.close();
console.log(`${checks} Ops recovery, dual-access onboarding, session revocation and legacy sign-in checks passed (local PostgreSQL and test mailbox).`);
