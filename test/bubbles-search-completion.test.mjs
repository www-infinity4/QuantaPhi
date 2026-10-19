import test from 'node:test';
import assert from 'node:assert/strict';
import {finishSearchReply} from '../workers/bubbles-tools/worker.mjs';
const original=()=>Response.json({ok:true,output:'SearXNG result: Lovilia is in Iowa.',sources:[{title:'Lovilia',url:'https://example.org'}],receipt:{tool:'web.search',status:'complete'}});
for(const [name,summarize] of [
 ['model throws',()=>{throw Error('provider unavailable')}],
 ['model fails HTTP',()=>Response.json({error:'failed'},{status:502})],
 ['model gives acknowledgement only',()=>Response.json({output:'On it.'})],
 ['model stalls',()=>new Promise(()=>{})]
])test(name+' preserves real search output and receipt',async()=>{
 const result=await finishSearchReply(original(),summarize,5),data=await result.json();
 assert.match(data.output,/Lovilia is in Iowa/);assert.equal(data.receipt.status,'complete');assert.equal(data.sources.length,1);
});
test('valid summary is returned',async()=>{
 const result=await finishSearchReply(original(),()=>Response.json({output:'According to the search result, Lovilia is in Iowa.'}),20);
 assert.match((await result.json()).output,/According to/);
});
