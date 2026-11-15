import 'server-only';
import {getPool} from '@/lib/db';
import {compileOpsSql} from './sql';
export interface OpsResult<T=Record<string,unknown>>{results:T[];success:boolean;meta:{changes:number};}
export interface OpsPreparedStatement{
 bind(...values:unknown[]):OpsPreparedStatement;
 first<T=Record<string,unknown>>(column?:string):Promise<T|null>;
 all<T=Record<string,unknown>>():Promise<OpsResult<T>>;
 run():Promise<OpsResult>;
}
export interface OpsDatabase{prepare(sql:string):OpsPreparedStatement;batch(statements:OpsPreparedStatement[]):Promise<OpsResult[]>;}
class Statement implements OpsPreparedStatement{
 constructor(readonly sql:string,readonly values:unknown[]=[]){ }
 bind(...values:unknown[]){return new Statement(this.sql,values);}
 async first<T=Record<string,unknown>>(column?:string):Promise<T|null>{const row=(await this.all()).results[0];return row?(column?row[column]:row) as T:null;}
 async all<T=Record<string,unknown>>():Promise<OpsResult<T>>{return (await execute([this]))[0] as OpsResult<T>;}
 async run(){return (await execute([this]))[0];}
}
async function execute(statements:OpsPreparedStatement[]){
 const client=await getPool().connect();
 try{
  await client.query('BEGIN');
  await client.query('SET LOCAL search_path=ops,public');
  if(statements.some(s=>!/^\s*SELECT\b/i.test((s as Statement).sql)))await client.query('SELECT pg_advisory_xact_lock(76019)');
  const results:OpsResult[]=[];let changes=0;
  for(const statement of statements){const s=statement as Statement;
   const result=await client.query(compileOpsSql(s.sql,s.values,changes),s.values);
   const integers=result.fields.filter(f=>[20,1700].includes(f.dataTypeID)).map(f=>f.name);
   const booleans=result.fields.filter(f=>f.dataTypeID===16).map(f=>f.name);
   for(const row of result.rows){for(const k of integers)if(row[k]!==null)row[k]=Number(row[k]);for(const k of booleans)row[k]=row[k]?1:0;}
   changes=['INSERT','UPDATE','DELETE'].includes(result.command)?result.rowCount||0:0;
   results.push({results:result.rows,success:true,meta:{changes}});
  }
  await client.query('COMMIT');return results;
 }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}finally{client.release();}
}
export function opsDatabase():OpsDatabase{return {prepare:sql=>new Statement(sql),batch:execute};}
export async function opsReady(){
 try{return (await getPool().query('SELECT ready FROM ops.settings WHERE id=1')).rows[0]?.ready===true;}
 catch(e){if((e as {code?:string})?.code==='42P01'||(e as {code?:string})?.code==='3F000')return false;throw e;}
}
