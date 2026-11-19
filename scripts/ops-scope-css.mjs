import {readFileSync,writeFileSync} from 'node:fs';
import postcss from 'postcss';
const root=new URL('../src/ops/theme/',import.meta.url);
const list=readFileSync(new URL('globals.css',root),'utf8').matchAll(/@import '\.\/(.*?)';/g);
let css='/* Scoped Ops workspace; marketing and customer PWA styles are unchanged. */\n';
function selectors(s){let depth=0,quote='',part='',items=[];for(const ch of s){if(quote){part+=ch;if(ch===quote)quote='';continue;}if(ch==='"'||ch==="'")quote=ch;if(ch==='('||ch==='[')depth++;if(ch===')'||ch===']')depth--;if(ch===','&&depth===0){items.push(part);part='';}else part+=ch;}items.push(part);return items;}
for(const [,file]of list){
 const ast=postcss.parse(readFileSync(new URL(file,root),'utf8'));
 ast.walkAtRules('import',r=>r.remove());
 ast.walkRules(rule=>{
  let parent=rule.parent;while(parent){if(parent.type==='atrule'&&/keyframes/i.test(parent.name))return;parent=parent.parent;}
  rule.selector=selectors(rule.selector).map(selector=>{
   const s=selector.trim().replace(/:root/g,'.werigo-ops').replace(/(^|[\s>+~,(])(html|body)(?=$|[\s.#[:>+~,)])/g,'$1.werigo-ops');
   return s.startsWith('.werigo-ops')?s:'.werigo-ops '+s;
  }).join(',');
 });
 css+=ast.toString()+'\n';
}
css+='\n.werigo-ops{min-height:100dvh;width:100%;font-family:var(--font-geist),var(--font-inter),sans-serif;color:#061e20;background:#faf6ee;isolation:isolate}\n';
writeFileSync(new URL('../src/app/ops/ops.css',import.meta.url),css);
