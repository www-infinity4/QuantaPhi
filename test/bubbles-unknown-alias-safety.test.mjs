import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{explainUnverifiedAlias} from '../workers/bubbles-tools/worker.mjs';

const unknown='GrammarPhi concept test: I typed fooey radyo sityatiom. Fooey is not a standard command. Explain how to resolve a typo from verified per-user aliases without running untrusted text as JavaScript, shell, or Python. State what cannot be concluded without the actual alias catalog.';
test('unknown alias is explained without accessing a private alias catalog or running code',()=>{
 const answer=explainUnverifiedAlias(unknown);
 assert.match(answer,/fooey/i);
 assert.match(answer,/not (?:a )?verified command/i);
 assert.match(answer,/never execute untrusted alias text/i);
 assert.match(answer,/JavaScript/);
 assert.match(answer,/Python/);
 assert.match(answer,/shell/);
 assert.match(answer,/not read or verified any private alias/i);
});
test('public alias explanation returns an explicitly non-executing receipt',async()=>{
 const request=new Request('https://bubbles-tools.marvaseater.workers.dev/v1/assist',{
  method:'POST',headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},
  body:JSON.stringify({request:unknown,mcp:true})});
 const r=await worker.fetch(request,{});
 const json=await r.json();
 assert.equal(json.ok,true);
 assert.equal(json.receipt.tool,'alias.safety_explanation');
 assert.equal(json.receipt.status,'complete');
 assert.equal(json.receipt.executed,false);
 assert.equal(json.receipt.repositoryActionsVerified,false);
 assert.match(json.output,/fooey/i);
});
test('ordinary novel user requests and explicitly authorized work are not preempted',()=>{
 assert.equal(explainUnverifiedAlias('Create a new GrammarPhi alias in the authorized repository.'),'');
 assert.equal(explainUnverifiedAlias('Explain the documented alias for my profile.'),'');
 assert.equal(explainUnverifiedAlias('Please run the Python test in the authorized sandbox.'),'');
});
