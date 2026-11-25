import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
// Independent reference encoder for Moltnook's native-context V1 wire format.
function packContext(scope,records,known=[]){
 const key=JSON.stringify([scope.jobId,scope.repo,scope.baseSha]),seen=new Set(known);
 return {version:1,scope,entries:records.map(text=>{
  const id=createHash('sha256').update(JSON.stringify([key,text])).digest('hex');
  if(seen.has(id))return {id};seen.add(id);return {id,text};
 })};
}
import {decodeNativeEvidence} from './native-context.mjs';
const lease={ticketId:'T1',jobId:'J1',repository:'owner/repo'};
const scope={jobId:'T1/J1',repo:'owner/repo',baseSha:'a'.repeat(40)};
const path='/runner/build';
const base={baseSha:scope.baseSha,source:'∆ — evidence'};
const packet=(value=base)=>packContext(scope,[JSON.stringify(value)]);
test('portable receiver matches Moltnook packet and reconstructs repeated UTF-8 data',async()=>{
 const segment=JSON.stringify('∆ — evidence');
 const p=packContext(scope,['{"baseSha":'+JSON.stringify(scope.baseSha)+',"a":',segment,',"b":',segment,'}']);
 assert.deepEqual(await decodeNativeEvidence({nativeEvidence:p},lease,path),{baseSha:scope.baseSha,a:'∆ — evidence',b:'∆ — evidence'});
});
test('legacy evidence passes unchanged',async()=>assert.equal(await decodeNativeEvidence({evidence:base},lease,path),base));
test('rejects mismatched job/repo, conflicting input and non-model routes',async()=>{
 for(const [b,l,p] of [[{nativeEvidence:packet()},{...lease,jobId:'J2'},path],[{nativeEvidence:packet()},{...lease,repository:'owner/other'},path],[{nativeEvidence:packet(),evidence:base},lease,path],[{nativeEvidence:packet()},lease,'/runner/result']])await assert.rejects(decodeNativeEvidence(b,l,p),/native_context/);
});
test('rejects tampering, stale SHA and references from earlier requests',async()=>{
 const p=packet(); p.entries[0].text+=' ';await assert.rejects(decodeNativeEvidence({nativeEvidence:p},lease,path),/integrity/);
 await assert.rejects(decodeNativeEvidence({nativeEvidence:packet({...base,baseSha:'b'.repeat(40)})},lease,path),/scope/);
 const full=packet();await decodeNativeEvidence({nativeEvidence:full},lease,path);
 const ref=packContext(scope,[JSON.stringify(base)],full.entries.map(e=>e.id));await assert.rejects(decodeNativeEvidence({nativeEvidence:ref},lease,path),/missing/);
});
test('rejects malformed JSON, arrays, oversized entries and excessive expanded bytes',async()=>{
 for(const records of [['not json'],['[]']])await assert.rejects(decodeNativeEvidence({nativeEvidence:packContext(scope,records)},lease,path),/invalid/);
 const p=packet();p.entries[0].text='x'.repeat(32769);await assert.rejects(decodeNativeEvidence({nativeEvidence:p},lease,path),/limit/);
 const chunk='x'.repeat(32000), q=packContext(scope,[chunk]);q.entries.push(...Array(4).fill({id:q.entries[0].id}));await assert.rejects(decodeNativeEvidence({nativeEvidence:q},lease,path),/limit/);
});
