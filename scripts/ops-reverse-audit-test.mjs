import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {runReverseAudit} from './ops-reverse-live-audit.mjs';
const db=new PGlite();
try{
 for(const f of readdirSync('db/migrations').filter(x=>x.endsWith('.sql')).sort())await db.exec('BEGIN;'+readFileSync('db/migrations/'+f,'utf8')+'COMMIT;');
 await db.query("INSERT INTO ops.units(id,code,model,usage,state,created_at,updated_at) VALUES('reverse-fixture','REVERSE-FIXTURE','edpower','rental','ready',$1,$1)",[Date.now()]);
 await db.exec('UPDATE ops.settings SET ready=true WHERE id=1');
 const single=await runReverseAudit({query:(...args)=>db.query(...args)});
 assert.equal(single.rolled_back,true);assert.equal(single.persisted_test_rows,0);assert.equal(single.website_last_unit_conflict_rejected,true);assert.equal(single.manual_rejects_website_held_unit,true);assert.equal(single.available_after_rollback,1);
 await db.query("INSERT INTO ops.units(id,code,model,usage,state,created_at,updated_at) VALUES('reverse-fixture2','REVERSE-FIXTURE2','edpower','rental','ready',$1,$1)",[Date.now()]);
 const multiple=await runReverseAudit({query:(...args)=>db.query(...args)});
 assert.equal(multiple.website_avoids_manual_unit,true);assert.equal(multiple.available_after_rollback,2);assert.equal(multiple.persisted_test_rows,0);
 console.log('8 reverse rollback audit checks passed for single-unit and multi-unit stock; no external database.');
}finally{await db.close();}
