import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleRepair} from '../scripts/site-integrity-publish.mjs';
const mainSha='a'.repeat(40),headSha='b'.repeat(40),baseSource='<div></div>\\n<div></div>';
const source='<div></div>\n<div></div>';
const pr={number:1,state:'open',draft:false,mergeable:true,mergeable_state:'clean',base:{ref:'main',sha:mainSha},head:{ref:'site-integrity/autofix-aaaaaaaaaaaa',sha:headSha,repo:{full_name:'www-infinity4/QuantaPhi'}},user:{login:'github-actions[bot]'}};
const files=[{filename:'index.html',status:'modified'}];
const checks=[{name:'site-integrity-source-and-browser',status:'completed',conclusion:'success'},{name:'other',status:'completed',conclusion:'success'}];
const args={pr,files,baseSource,headSource:source,checks,mainSha};
test('promotes only exact deterministic patch on matching main and all green CI',()=>assert.equal(eligibleRepair(args),null));
test('blocks authored nonbot, unexpected changes, and stale base',()=>{
 assert.equal(eligibleRepair({...args,pr:{...pr,user:{login:'someone'}}}),'untrusted_author');
 assert.equal(eligibleRepair({...args,files:[...files,{filename:'wallet-runtime.js',status:'modified'}]}),'unsafe_changed_files');
 assert.equal(eligibleRepair({...args,mainSha:headSha}),'unmergeable_or_stale');
 assert.equal(eligibleRepair({...args,headSource:source+'<script>alert(1)</script>'}),'unverified_source_delta');
});
test('blocks missing, running, and failed checks plus nonclean merge state',()=>{
 assert.equal(eligibleRepair({...args,checks:checks.filter(c=>c.name==='other')}),'guard_ci_not_green');
 assert.equal(eligibleRepair({...args,checks:[...checks,{name:'another',status:'in_progress'}]}),'pending_or_failed_checks');
 assert.equal(eligibleRepair({...args,checks:[...checks,{name:'another',status:'completed',conclusion:'failure'}]}),'pending_or_failed_checks');
 assert.equal(eligibleRepair({...args,pr:{...pr,mergeable_state:'blocked'}}),'unmergeable_or_stale');
});

test('Platinum text-only repair has the same exact SHA and diff protection',()=>{
 const baseSource='<section></section>\\n<section></section>';
 const headSource='<section></section>\n<section></section>';
 const files=[{filename:'platinum/index.html',status:'modified'}];
 assert.equal(eligibleRepair({...args,files,baseSource,headSource}),null);
 assert.equal(eligibleRepair({...args,files:[...files,{filename:'physics-card.js',status:'modified'}],baseSource,headSource}),'unsafe_changed_files');
 assert.equal(eligibleRepair({...args,files:[{filename:'platinum/offline-sw.js',status:'modified'}],baseSource,headSource}),'unsafe_changed_files');
});
