import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {checkClaims,supported,authenticate} from '../workers/infinity-brain-clock/runner-auth.mjs';
import {applyEdits,clearButtonPatch} from '../scripts/brain-patch.mjs';
test('runner identity restricts audience, exact repo, workflow, main and expiry',()=>{
 const c={iss:'https://token.actions.githubusercontent.com',aud:'infinity-brain-writer',repository:'www-infinity4/QuantaPhi',repository_id:'1380883643',ref:'refs/heads/main',workflow_ref:'www-infinity4/QuantaPhi/.github/workflows/brain-writer.yml@refs/heads/main',event_name:'schedule',run_id:'123',exp:200,nbf:0};
 assert.equal(checkClaims(c,100),c);
 for(const change of [{aud:'other'},{repository:'www-infinity4/Moltnook'},{ref:'refs/pull/1/merge'},{workflow_ref:'other'},{exp:99},{event_name:'pull_request'}])assert.throws(()=>checkClaims({...c,...change},100));
});
test('unsigned public callers cannot claim writer access',async()=>{
 await assert.rejects(authenticate(new Request('https://brain/runner/claim')),/identity_required/);
});
test('adapter honors repository and dependency scope',()=>{
 assert.equal(supported({repository:'www-infinity4/QuantaPhi',instructions:'Create a clear text button',dependencies:[]}),true);
 assert.equal(supported({repository:'www-infinity4/Moltnook',instructions:'clear text'}),false);
 assert.equal(supported({repository:'www-infinity4/QuantaPhi',instructions:'clear text',dependencies:['ledger']}),false);
});
test('clear patch uniquely edits source and cannot mutate privileged files',async()=>{
 const original={'robot-directions.js':await fs.readFile(new URL('../robot-directions.js',import.meta.url),'utf8')};
 const edits=clearButtonPatch(original);
 if(edits.length){const result=applyEdits(original,edits);assert.match(result['robot-directions.js'],/clearButton.dataset.clear='1'/);assert.match(result['robot-directions.js'],/localStorage.removeItem\(DRAFT\)/);assert.deepEqual(clearButtonPatch(result),[]);}
 assert.throws(()=>applyEdits({'.github/workflows/x.yml':'abc'},[{path:'.github/workflows/x.yml',before:'abc',after:'xyz'}]));
 assert.throws(()=>applyEdits({'robot-directions.js':'abc abc'},[{path:'robot-directions.js',before:'abc',after:'xyz'}]));
});
