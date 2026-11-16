import assert from 'node:assert/strict';
import {opsPageIds} from '../src/ops/lib/workspace-access.ts';
import {modulesFor} from '../src/components/admin/modules.ts';
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++;};
for(const role of ['','customer','admin','super_admin','bogus'])check(opsPageIds(role).length===0,`${role||'Anonymous'} never inherits Ops access from a website role`);
for(const role of ['','customer','owner','manager','finance','ops','bogus'])check(modulesFor(role).length===0,`${role||'Anonymous'} never inherits website admin access from an Ops role`);
check(['settings','activity','payments','reports'].every(id=>!opsPageIds('ops').includes(id)),'Operations staff do not get owner or finance navigation');
check(['payments','reports'].every(id=>opsPageIds('finance').includes(id)),'Finance retains payment and reporting access');
for(const role of ['manager','finance'])check(['settings','activity'].every(id=>!opsPageIds(role).includes(id)),`${role} cannot see owner-only team management and activity`);
check(['settings','activity'].every(id=>opsPageIds('owner').includes(id)),'Owner retains team management and activity');
for(const role of ['admin','super_admin']){
 const paths=modulesFor(role).map(m=>m.href);
 check(['articles','content','membership','promotions','referrals','customers','bookings','stock'].every(m=>paths.includes('/admin/'+m)),`${role} retains articles/content health, membership and all existing business modules`);
 check(new Set(paths).size===paths.length,`${role} has no duplicate website modules`);
}
check(modulesFor('admin').every(m=>!m.superOnly),'Regular website admin never gets super-admin modules');
check(['staff','audit','settings'].every(m=>modulesFor('super_admin').some(n=>n.href==='/admin/'+m)),'Super admin retains staff, audit and settings');
console.log(`${checks} workspace access and feature-preservation checks passed; no credentials or external database.`);
