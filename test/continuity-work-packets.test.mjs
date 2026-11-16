import test from 'node:test';import assert from 'node:assert/strict';
import {validPacket,selectActionPackets,needsHistoryScan,recordPacketReceipt,summarizedProgress} from '../continuity/work-packets.mjs';
const SHA='a'.repeat(40),OTHER='b'.repeat(40),repo='www-infinity4/QuantaPhi';
const p=(issue,over={})=>({repo,issue,headSha:SHA,nextAction:'edit_code',nextSourcePath:'some-file.mjs',priority:50,state:'ready',...over});
test('stable bounded packets, deduplicated and priority ordered',()=>{
 assert.ok(validPacket(p(5)));assert.equal(validPacket(p(5,{headSha:'not-sha'})),false);
 assert.deepEqual(selectActionPackets([p(4),p(4),p(5,{priority:80}),p(6,{priority:10})],{limit:2}).map(x=>x.issue),[5,4]);
 assert.equal(selectActionPackets([p(5)],{done:[repo+'#5#'+SHA]}).length,0);
});
test('rotates off same-head blockers and foreign active leases',()=>{
 const rows=[p(10,{priority:90,state:'blocked',blockReason:'needs permission'}),p(11,{priority:80,lease:{verified:true,active:true,holder:'other'}}),p(12,{priority:70}),p(13,{priority:60})];
 assert.deepEqual(selectActionPackets(rows,{ownerId:'owner',blocked:[{repo,issue:10,headSha:SHA,reason:'needs permission'}]}).map(x=>x.issue),[12,13]);
 assert.equal(selectActionPackets([p(10,{headSha:OTHER,state:'blocked',blockReason:'needs permission'})],{blocked:[{repo,issue:10,headSha:SHA,reason:'needs permission'}]}).length,1);
});
test('only scans changed index version',()=>{
 assert.equal(needsHistoryScan({currentVersion:SHA,lastScannedVersion:SHA}),false);
 assert.equal(needsHistoryScan({currentVersion:OTHER,lastScannedVersion:SHA}),true);
});
test('merge requires green exact-head checks, independent review and provider receipt',()=>{
 assert.deepEqual(selectActionPackets([p(2,{nextAction:'merge_pr',requiredChecksPassed:true,requiredReviewsSatisfied:false}),p(3,{nextAction:'merge_pr',requiredChecksPassed:true,requiredReviewsSatisfied:true})]).map(x=>x.issue),[3]);
 const bad={repo,issue:3,headSha:SHA,action:'merge_pr',result:'merged',idempotencyKey:'merge-1',mergeSha:OTHER};
 assert.throws(()=>recordPacketReceipt([],p(3),bad),/merge_unverified/);
 const receipts=recordPacketReceipt([],p(3),{...bad,providerConfirmed:true});
 assert.equal(summarizedProgress(receipts).merged,1);
 assert.equal(recordPacketReceipt(receipts,p(3),{...bad,providerConfirmed:true}).length,1);
});
test('blocked is not a claimed mutation, code edits require actual provider evidence',()=>{
 const base={repo,issue:5,headSha:SHA,action:'edit_code',idempotencyKey:'edit-1'};
 assert.throws(()=>recordPacketReceipt([],p(5),{...base,result:'changed'}),/write_unverified/);
 const rows=recordPacketReceipt([],p(5),{...base,result:'blocked',reason:'missing approved owner token'});
 assert.equal(summarizedProgress(rows).changed,0);
 assert.equal(summarizedProgress(rows).blocked,1);
});
