import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
let member=null,admin=null,ready=true,checks=0;
const component=(kind)=>function MockComponent(props){return React.createElement('section',{'data-kind':kind,'data-role':props.role||props.adminRole||props.opsRole,'data-website':props.websiteRole,'data-connect':props.connecting?'yes':undefined,'data-mode':props.initialMode},props.children);};
const mocks={
 'next/navigation':{redirect:(path)=>{throw new Error('REDIRECT:'+path);}},
 '@/lib/adminAuth':{getAdmin:async()=>admin},
 '@/lib/adminOverview':{getAdminOverview:async()=>null},
 '@/components/admin/AdminHome':{AdminHome:component('website-home')},
 '@/components/admin/AdminShell':{AdminShell:component('website-shell')},
 '@/ops/lib/workspace-context':{optionalOpsMember:async()=>member},
 '@/ops/lib/database':{opsReady:async()=>ready},
 './login':{Login:component('login')},
 './ops-app':{default:component('ops-home'),__esModule:true},
 './language':{LanguageProvider:({children})=>children},
};
const code=ts.transpileModule(readFileSync('src/ops/ui/home.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const m={exports:{}};new Function('require','module','exports',code)((id)=>mocks[id]??require(id),m,m.exports);
const page=async(params={})=>renderToStaticMarkup(await m.exports.default({searchParams:Promise.resolve(params)}));
const check=(value,message)=>{assert.ok(value,message);checks++;};
check((await page()).includes('data-kind="login"'),'Anonymous entry shows sign-in, never either dashboard');
member={name:'Local Ops',role:'ops'};
let html=await page();check(html.includes('data-kind="ops-home"')&&!html.includes('data-website='),'An Ops-only identity gets operations without website rights');
member=null;admin={name:'Local Admin',email:'local@example.invalid',role:'admin',mustChangePassword:false};
html=await page();check(html.includes('website-shell')&&html.includes('website-home')&&!html.includes('ops-home'),'Website-only admin retains website features without fabricated Ops access');
member={name:'Local Owner',role:'owner'};
html=await page();check(html.includes('ops-home')&&html.includes('data-role="owner"')&&html.includes('data-website="admin"'),'Two existing identities keep their separate roles in the primary Ops frame');
html=await page({connect:'website'});check(html.includes('data-mode="website"')&&html.includes('data-connect="yes"'),'Connecting website access explicitly asks for website credentials');
html=await page({connect:'ops'});check(html.includes('data-mode="ops"')&&html.includes('data-connect="yes"'),'Connecting operations explicitly asks for Ops credentials');
member=null;html=await page({connect:'website'});check(html.includes('website-home')&&!html.includes('data-connect='),'A query parameter cannot invent an Ops identity');
ready=false;html=await page();check(html.includes('website-home'),'Website features remain available if Ops setup is not ready');ready=true;
admin={...admin,mustChangePassword:true};
await assert.rejects(()=>page(),/REDIRECT:\/admin\/profile\?change=1/);checks++;
console.log(`${checks} workspace entry, separate-identity and password-gate checks passed; auth I/O substituted.`);
