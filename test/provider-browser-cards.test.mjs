import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import fs from 'node:fs';
import {validateProviderBrowser,handleProviderBrowser,PROVIDERS} from '../workers/infinity-brain-clock/provider-browser.mjs';
import {officialProviderUrl,PROVIDER_DESTINATIONS} from '../provider-quick-cards.mjs';
import {browserAnswerText,requestOwnerGemini} from '../gemini-owner-browser-card.mjs';
globalThis.crypto??=webcrypto;
const stored=new Map();
const storage={get:async key=>stored.get(key),put:async(key,value)=>{stored.set(key,structuredClone(value));}};
const env={TINYFISH_API_KEY:'only-a-test-provider-secret',TINYFISH_PROFILE_ID:'prof_5300ab1bb4c74ce6'};
const runId='12345678-1234-4234-8234-123456789def';
const mock=(calls,state='COMPLETED')=>async(url,opts)=>{
 calls.push({url,opts});
 return Response.json(url.endsWith('/run-async')?{run_id:runId}:{status:state,result:{observed:'sample browser page; cannot prove provider reply'}});
};
test('allow only fixed providers and bounded single-question requests',()=>{
 assert.ok(PROVIDERS.gemini.url.startsWith('https://gemini.google.com/'));
 assert.throws(()=>validateProviderBrowser({action:'ask',provider:'madeup',question:'hello'}));
 assert.throws(()=>validateProviderBrowser({action:'ask',provider:'gemini',question:'x'.repeat(1001)}));
 assert.throws(()=>validateProviderBrowser({action:'ask',provider:'gemini',question:'hello',url:'https://other.test'}));
 assert.deepEqual(validateProviderBrowser({action:'ask',provider:'gemini',question:'hello'}).provider,'gemini');
});
test('no backend secret causes a disconnected Gemini receipt not a fake answer',async()=>{
 const calls=[];
 const r=await handleProviderBrowser(storage,{}, {action:'ask',provider:'gemini',question:'What is a qubit?'},mock(calls),Date.UTC(2026,9,27));
 assert.equal(r.httpStatus,503);assert.equal(calls.length,0);
 const capability=await handleProviderBrowser(storage,{}, {action:'capabilities'},mock(calls));
 assert.equal(capability.result.configured,false);
});
test('other provider sessions disabled until independently authorized',async()=>{
 const calls=[];
 const r=await handleProviderBrowser(storage,env,{action:'ask',provider:'claude',question:'Summarize this idea'},mock(calls),Date.UTC(2026,9,27));
 assert.equal(r.httpStatus,409);assert.equal(calls.length,0);
});
test('owner Gemini pilot starts fixed official session and exposes status only',async()=>{
 stored.clear();const calls=[];
 const q='State one fact about hydrogen.';
 const started=await handleProviderBrowser(storage,env,{action:'ask',provider:'gemini',question:q},mock(calls),Date.UTC(2026,9,27));
 assert.equal(started.httpStatus,202);assert.equal(started.result.job.state,'working');assert.equal(calls.length,1);
 const sent=JSON.parse(calls[0].opts.body);
 assert.equal(sent.url,'https://gemini.google.com/app');assert.equal(sent.use_profile,true);
 assert.equal(sent.profile_id,env.TINYFISH_PROFILE_ID);
 assert.match(sent.goal,/Never fetch prior chat history/);assert.ok(sent.goal.includes(q));
 const s=await handleProviderBrowser(storage,env,{action:'status',id:started.result.job.id},mock(calls),Date.UTC(2026,9,27));
 assert.equal(s.result.job.state,'completed_browser_run');
 assert.equal(s.result.verifiedProviderAnswer,false);
 assert.equal(calls.length,2);
});
test('official provider quick-card URLs never pretend to pass Google sessions',()=>{
 assert.equal(officialProviderUrl('gemini'),'https://gemini.google.com/app');
 assert.equal(officialProviderUrl('levis'),'https://www.levi.com/US/en_US/');
 assert.equal(officialProviderUrl('unregistered'),null);
 assert.ok(Object.values(PROVIDER_DESTINATIONS).every(v=>new URL(v[1]).protocol==='https:'));
 const source=fs.readFileSync(new URL('../source-quick-cards.mjs',import.meta.url),'utf8');
 for(const id of ['microsoft-copilot','ibm-watsonx','levis'])assert.ok(source.includes("source('"+id+"'"));
 assert.ok(source.includes("mountOwnerGeminiBrowserTool"));
});
test('owner Gemini card checks authorization and never fabricates a provider answer',async()=>{
 assert.match(browserAnswerText({state:'completed_browser_run',summary:'sample'}),/not independently verified/);
 let calls=0;
 await assert.rejects(requestOwnerGemini({action:'ask',provider:'gemini',question:'Hello'},{getHeaders:async()=>({}),fetcher:async()=>{calls++;}}),/Owner verification/);
 assert.equal(calls,0);
});
