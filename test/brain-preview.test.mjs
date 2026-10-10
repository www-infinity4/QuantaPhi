import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {validatePreview} from '../workers/infinity-brain-clock/preview-contract.mjs';
import {sourceSection} from '../scripts/brain-preview.mjs';
const metadata={repository:'www-infinity4/QuantaPhi',baseSha:'a'.repeat(40),commitSha:'b'.repeat(40),paths:['robot-directions.js'],summary:'Clear draft',status:'source_preview',before:'data:image/jpeg;base64,/9j/AA==',after:'data:image/jpeg;base64,/9j/AA=='};
test('two portals require distinct immutable revisions and bounded image-only payloads',()=>{
 assert.equal(validatePreview({...metadata}).status,'source_preview');
 for(const override of [{commitSha:metadata.baseSha},{repository:'other/repo'},{status:'complete'},{before:'javascript:alert(1)'},{after:'data:image/svg+xml,<svg/>'},{paths:['.env']},{summary:'x'.repeat(501)},{before:'data:image/jpeg;base64,'+'A'.repeat(60000)}])assert.throws(()=>validatePreview({...metadata,...override}));
});
test('source preview preserves nested sections from exact source',async()=>{
 const html='<p>outside</p><section id="quantaAgentIterations"><section id="robotDirections">before</section><div>after</div></section><footer>outside</footer>';
 assert.equal(sourceSection(html),'<section id="quantaAgentIterations"><section id="robotDirections">before</section><div>after</div></section>');
 assert.throws(()=>sourceSection('<section id="quantaAgentIterations">'));
 const source=sourceSection(await fs.readFile('index.html','utf8'));assert.ok(source.includes('id="robotDirections"'));assert.ok(!source.includes('id="phiStoryWriter"'));
});
test('owner identity remains required for work images and engine identities are exact',async()=>{
 const auth=await import('../workers/infinity-brain-clock/runner-auth.mjs');
 const c={iss:'https://token.actions.githubusercontent.com',aud:'infinity-brain-writer',repository:'www-infinity4/Moltnook',repository_id:'1188306316',ref:'refs/heads/main',workflow_ref:'www-infinity4/Moltnook/.github/workflows/moltnook-repository-engine.yml@refs/heads/main',event_name:'schedule',run_id:'123',exp:200,nbf:0};
 assert.equal(auth.checkClaims(c,100),c);
 assert.throws(()=>auth.checkClaims({...c,workflow_ref:'www-infinity4/Moltnook/.github/workflows/guestbook.yml@refs/heads/main'},100));
 assert.throws(()=>auth.checkClaims({...c,repository_id:'1380883643'},100));
});
