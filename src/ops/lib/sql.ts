// A small, explicit placeholder adapter. SQL stays server-owned, never supplied
// by a request. Quoted question marks must not become bind parameters.
export function compileOpsSql(sql:string,values:unknown[],changes=0){
 let out='',quote='',index=0;
 for(let i=0;i<sql.length;i++){
  const ch=sql[i];
  if(quote){out+=ch;if(ch===quote){if(sql[i+1]===quote){out+=sql[++i];}else quote='';}continue;}
  if(ch==="'"||ch==='"'){quote=ch;out+=ch;continue;}
  if(ch==='?'){const value=values[index++];out+='$'+index+(typeof value==='number'?'::bigint':'');}else out+=ch;
 }
 if(index!==values.length)throw new Error('OPS_BIND_COUNT_MISMATCH');
 return out.replace(/\bchanges\(\)/g,String(changes));
}
