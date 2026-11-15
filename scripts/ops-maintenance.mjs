// Retained command entry point for older runbooks; never activate the old bridge.
import {consolidate} from './ops-consolidate.mjs';
const mode=process.argv[2]||'audit';
if(mode!=='audit')throw new Error('USE_OPS_CONSOLIDATION_WORKFLOW');
await consolidate('inspect');
