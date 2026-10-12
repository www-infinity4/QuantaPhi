import test from 'node:test';import assert from 'node:assert/strict';
import {candidateFromEvidence,validateCandidate} from '../scripts/oracle-safe-repair.mjs';
const src={ 'phi-scholastic-data.css':'#result .qdata-actions{display:flex}', 'index.html':'<script defer src="/phi-assimilation.js?v=123"></script>', 'phi-scholastic-data.js':'function show(){const element="qdata-comparison-table"}' };
test('Only the verified missing 44px research button style gets repaired',()=>{
 const patch=candidateFromEvidence([{area:'accessibility',message:'Minimum touch target missing'}],src);
 assert.equal(patch.id,'touch-target');assert.equal(patch.path,'phi-scholastic-data.css');
 assert.match(validateCandidate(patch,src).after,/min-height:44px/);
 assert.ok(!patch.after.includes('wallet'));
 const fixed={...src,'phi-scholastic-data.css':patch.after};
 assert.equal(candidateFromEvidence([{area:'accessibility'}],fixed),null);
});
test('The comparison table gets mobile scroll style only when source viewer exists',()=>{
 const files={...src,'phi-scholastic-data.css':'#result .qdata-actions button{min-height:44px}'};
 const patch=candidateFromEvidence([{area:'compare'}],files);
 assert.equal(patch.id,'compare-viewer-style');assert.match(validateCandidate(patch,files).after,/overflow-x:auto/);
});
test('Missing reader script can be restored only at unique known assimilation anchor',()=>{
 const files={...src,'phi-scholastic-data.css':'#result .qdata-actions button{min-height:44px}'};
 const patch=candidateFromEvidence([{area:'asset',message:'phi-scholastic-data.js is missing'}],files);
 assert.equal(patch.id,'restore-reader-script');assert.match(validateCandidate(patch,files).after,/phi-scholastic-data.js\?v=oracle-autofix/);
 assert.equal(candidateFromEvidence([{area:'asset',message:'phi-scholastic-data.js'}],{...files,'index.html':files['index.html'].repeat(2)}),null);
});
test('Do not mutate wallet or security files, or produce patches without evidence',()=>{
 assert.equal(candidateFromEvidence([],src),null);
 assert.throws(()=>validateCandidate({id:'touch-target',path:'workers/quanta-phi-ledger/worker.js',before:'a',after:'b'},{'workers/quanta-phi-ledger/worker.js':'a'}),/scope/);
 assert.throws(()=>validateCandidate({id:'touch-target',path:'phi-scholastic-data.css',before:'wrong',after:'changed'},src),/base/);
});
