// Isolated request and SMTP-adapter checks. No network, env file or real email.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { randomUUID } from "node:crypto";
import ts from "typescript";
const require=createRequire(import.meta.url);
function load(file,mocks={},extra={}) {
  const module={exports:{}};
  const code=ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,require:key=>key in mocks?mocks[key]:require(key),Response,Request,Headers,URL,TextDecoder,Uint8Array,console:{warn:()=>{}},...extra},{filename:file});
  return module.exports;
}
const {createSupportHandler,SUPPORT_RECIPIENTS}=load("src/lib/support.ts");
const origin="https://werigo.co";
const payload=(changes={})=>({kind:"question",name:"Website test",email:"sender@example.test",phone:"",company:"",message:"A test enquiry about rental dates.",locale:"en",source:"/contact",submissionId:randomUUID(),website:"",...changes});
const request=(data,headers={})=>new Request(origin+"/api/support",{method:"POST",headers:{origin,"content-type":"application/json","x-forwarded-for":"192.0.2.1",...headers},body:JSON.stringify(data)});
let checks=0;
const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
const ok=(value,message)=>{assert.ok(value,message);checks++;};
const status=async(response,expected,message)=>equal((await response).status,expected,message);
function fixture(overrides={}) { const sent=[]; return {sent,handler:createSupportHandler({trustedOrigin:origin,allowLocalOrigins:false,isConfigured:()=>true,send:async mail=>{sent.push(mail);},...overrides})}; }
{
  const f=fixture(); await status(f.handler(request(payload())),200,"Valid enquiries send");
  equal([...f.sent[0].to],[...SUPPORT_RECIPIENTS],"Both fixed business recipients are used");
  equal(f.sent[0].replyTo,"sender@example.test","Replies go to the validated sender");
  ok(f.sent[0].subject.includes("Customer question"),"Question subject is selected by server");
  await status(f.handler(request(payload({to:"attacker@example.test"}))),422,"Caller cannot choose recipients");
  equal(f.sent.length,1,"Invalid recipient override sends nothing");
}
{
  const f=fixture(); await status(f.handler(request(payload({kind:"partnership",company:'Cafe <script>x</script>',message:'A partnership idea <img src=x onerror=alert(1)>'}))),200,"Partnership enquiry sends");
  ok(f.sent[0].subject.includes("Partnership"),"Partnership subject is separate");
  ok(f.sent[0].html.includes("&lt;script&gt;")&&!f.sent[0].html.includes("<script>"),"Business text is escaped");
  ok(f.sent[0].html.includes("&lt;img"),"Message markup is escaped");
}
{
  const f=fixture(); await status(f.handler(request(payload(),{origin:"https://attacker.example"})),403,"Cross-site requests are refused");
  await status(f.handler(request(payload(),{origin:""})),403,"Missing origin is refused");
  await status(f.handler(request(payload(),{"content-type":"text/plain"})),415,"JSON is required");
  await status(f.handler(request(payload({message:"short"}))),422,"Short messages are rejected");
  await status(f.handler(request(payload({name:"A"}))),422,"Missing meaningful name is rejected");
  await status(f.handler(request(payload({email:"sender@example.test\r\nBcc: other@example.test"}))),422,"Email header injection is rejected");
  await status(f.handler(request(payload({phone:"not-a-phone"}))),422,"Invalid phone value is rejected");
  await status(f.handler(request(payload({message:"x".repeat(13000)}))),413,"Actual request stream is bounded");
  await status(f.handler(request(payload(),{"content-length":"13000"})),413,"Declared oversized body is refused");
  await status(f.handler(new Request(origin+"/api/support",{method:"POST",headers:{origin,"content-type":"application/json"},body:"{"})),400,"Malformed JSON is rejected");
  equal(f.sent.length,0,"Rejected requests never reach SMTP");
}
{
  const f=fixture({isConfigured:()=>false}); const response=await f.handler(request(payload()));
  equal(response.status,503,"Unconfigured SMTP cannot produce success"); equal((await response.json()).ok,false,"Unavailable mail is explicit"); equal(f.sent.length,0,"No SMTP call without configuration");
}
{
  const f=fixture({allowLocalOrigins:true});
  const local=(origin)=>new Request("http://localhost:3153/api/support",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(payload())});
  await status(f.handler(local("http://127.0.0.1:3153")),200,"Development permits loopback aliases on the same port");
  await status(f.handler(local("http://127.0.0.1:3154")),403,"Other development ports remain blocked");
  const production=fixture(); await status(production.handler(local("http://127.0.0.1:3153")),403,"Production does not allow loopback origins");
}
{
  const f=fixture({send:async()=>{throw new Error("secret fixture transport detail");}});
  const response=await f.handler(request(payload())); equal(response.status,502,"SMTP failures are not reported as sent"); ok(!(await response.text()).includes("secret fixture"),"Provider details are not exposed");
}
{
  const f=fixture(); const value=payload(); await status(f.handler(request(value)),200,"First request sends"); await status(f.handler(request(value)),200,"A retry is acknowledged"); equal(f.sent.length,1,"Retries do not send duplicate email");
  await status(f.handler(request({...value,message:"A different message with a reused ID."})),409,"Changed messages cannot reuse a submission ID");
}
{
  let finish; let sends=0; const gate=new Promise(resolve=>{finish=resolve;}); const f=fixture({send:async()=>{sends++;await gate;}}); const value=payload();
  const a=f.handler(request(value)); const b=f.handler(request(value)); await new Promise(resolve=>setTimeout(resolve,10)); finish();
  await status(a,200,"First concurrent submission sends"); await status(b,200,"Second concurrent submission shares result"); equal(sends,1,"Double-click coalesces to one email");
}
{
  let now=0; const f=fixture({now:()=>now}); for(let i=0;i<3;i++) await status(f.handler(request(payload())),200,"Permitted rate-limit request");
  await status(f.handler(request(payload())),429,"Fourth request is throttled"); now=600001; await status(f.handler(request(payload())),200,"Rate limit expires");
  await status(f.handler(request(payload({website:"bot-filled"}))),200,"Honeypot is discarded quietly"); equal(f.sent.length,4,"Honeypot sends no message");
}
{
  let result={accepted:[...SUPPORT_RECIPIENTS],rejected:[]}; const delivered=[];
  const mailer=load("src/lib/mailer.ts",{nodemailer:{createTransport:()=>({sendMail:async message=>{delivered.push(message);return result;}})}},{process:{env:{SMTP_PASSWORD:"isolated-test-fixture",NODE_ENV:"test"}}});
  const mail={to:[...SUPPORT_RECIPIENTS],replyTo:"sender@example.test",subject:"Fixture",text:"Fixture",html:"Fixture"};
  await mailer.sendRequiredSupportMail(mail); checks++;
  equal([...delivered[0].to],[...SUPPORT_RECIPIENTS],"SMTP adapter keeps both recipients");
  result={accepted:[SUPPORT_RECIPIENTS[0]],rejected:[SUPPORT_RECIPIENTS[1]]}; await assert.rejects(()=>mailer.sendRequiredSupportMail(mail)); checks++;
  result={accepted:[SUPPORT_RECIPIENTS[0]],rejected:[]}; await assert.rejects(()=>mailer.sendRequiredSupportMail(mail)); checks++;
  const unavailable=load("src/lib/mailer.ts",{nodemailer:{createTransport:()=>{throw new Error("Should not connect");}}},{process:{env:{NODE_ENV:"test"}}});
  await assert.rejects(()=>unavailable.sendRequiredSupportMail(mail)); checks++;
}
console.log(`Support: ${checks} isolated checks passed. No real email or env changes.`);
