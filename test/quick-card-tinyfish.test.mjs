import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import fs from 'node:fs';
import {planCardBrowserAction,cardActionGoal,cardCheckoutHandoff,CARD_SITES} from '../workers/infinity-brain-clock/quick-card-browser-policy.mjs';
import {handleQuickCardBrowser,validateQuickCardBrowser} from '../workers/infinity-brain-clock/quick-card-browser.mjs';
import {cardActionsFor,browserStatus,callCardBrowser} from '../quick-card-tinyfish-actions.mjs';
import {quickCardStorage} from './helpers/quick-card-storage.mjs';
globalThis.crypto??=webcrypto;
const env={TINYFISH_API_KEY:'mock-key-no-real-provider-access',TINYFISH_PROFILE_ID:'prof_abcdefabcdef1234'};
const runId='12345678-1234-4234-8234-123456789def';
const reqId='12345678-1234-4234-8234-123456789abc';
const mkFetch=calls=>async(url,init)=>{
 calls.push({url,init});
 if(url.endsWith('run-async'))return Response.json({run_id:runId});
 return Response.json({status:'COMPLETED',result:{
  summary:'Real page read in a fixture',items:[
   {name:'501 Jeans',price:'$82',url:'https://www.levi.com/US/en_US/a/501',note:'Size varies'},
   {name:'Unexpected',url:'https://other.example/product',price:'$20'}]
 }});
};
test('only trusted Quick Card websites and read-only actions are accepted',()=>{
 assert.ok(Object.keys(CARD_SITES).length>=10);
 assert.equal(planCardBrowserAction({cardId:'levis',action:'products',query:'501 jeans'}).url,'https://www.levi.com/US/en_US/');
 assert.throws(()=>planCardBrowserAction({cardId:'unregistered',action:'inspect'}),/unknown_card/);
 assert.throws(()=>planCardBrowserAction({cardId:'levis',action:'purchase',query:'501'}),/not_approved/);
 assert.throws(()=>planCardBrowserAction({cardId:'levis',action:'products',query:'x'.repeat(181)}),/too_long/);
 assert.throws(()=>planCardBrowserAction({cardId:'levis',action:'products',query:'<script>'}),/unsafe_query/);
 assert.throws(()=>planCardBrowserAction({cardId:'gemini',action:'search',query:'history'}),/not_approved/);
 const goal=cardActionGoal(planCardBrowserAction({cardId:'levis',action:'products',query:'501 jeans'}));
 assert.match(goal,/READ-ONLY/);assert.match(goal,/STOP/);assert.match(goal,/no/i);
 assert.doesNotMatch(goal,/collect credit card/i);
});
test('merchant checkout is a first-party link, never payment collection or automation',()=>{
 assert.deepEqual(cardCheckoutHandoff('levis','https://www.levi.com/US/en_US/a/501').processor,'merchant_only');
 assert.throws(()=>cardCheckoutHandoff('levis','https://evil.example/checkout'),/untrusted/);
 assert.throws(()=>cardCheckoutHandoff('gemini','https://gemini.google.com/app'),/not_a_shopping/);
 assert.throws(()=>cardCheckoutHandoff('levis','http://www.levi.com/a'),/untrusted/);
});
test('browser run requires separate backend credentials, never guest direct use',async t=>{
 const s=quickCardStorage(t),calls=[],f=mkFetch(calls);
 const denied=await handleQuickCardBrowser(s,{}, {action:'start',cardId:'levis',kind:'products',query:'501',requestId:reqId},f);
 assert.equal(denied.httpStatus,503);assert.equal(calls.length,0);
 const caps=await handleQuickCardBrowser(s,{}, {action:'capabilities'},f);
 assert.equal(caps.result.configured,false);
 assert.throws(()=>validateQuickCardBrowser({action:'start',cardId:'levis',kind:'products',query:'501',requestId:reqId,domain:'evil.example'}));
});
test('card click starts exactly one billed run and repeat click reuses its receipt',async t=>{
 const s=quickCardStorage(t),calls=[],f=mkFetch(calls),start={action:'start',cardId:'levis',kind:'products',query:'501 jeans',requestId:reqId};
 const a=await handleQuickCardBrowser(s,env,start,f);
 assert.equal(a.httpStatus,202);assert.equal(a.result.job.state,'working');
 const plan=JSON.parse(calls[0].init.body);
 assert.equal(plan.url,'https://www.levi.com/US/en_US/');assert.equal(plan.use_profile,true);
 assert.equal(calls.length,1);
 const again=await handleQuickCardBrowser(s,env,start,f);
 assert.equal(again.result.job.jobId,a.result.job.jobId);assert.equal(calls.length,1);
 const checked=await handleQuickCardBrowser(s,env,{action:'status',jobId:a.result.job.jobId},f);
 assert.equal(checked.result.job.state,'completed_browser_read');
 assert.equal(checked.result.job.report.verifiedSameSiteLinks,1);
 assert.equal(checked.result.job.report.items[1].url,'');
 assert.equal(checked.result.job.report.providerResultUnverified,true);
});
test('network uncertainty never retries the same paid action',async t=>{
 const s=quickCardStorage(t),calls=[];
 const badFetch=async(url,init)=>{calls.push(url);throw Error('network_lost')};
 const body={action:'start',cardId:'ebay',kind:'search',query:'Morgan dollar',requestId:reqId};
 const first=await handleQuickCardBrowser(s,env,body,badFetch);assert.equal(first.httpStatus,502);
 const next=await handleQuickCardBrowser(s,env,body,badFetch);assert.equal(next.result.job.state,'dispatch_uncertain');
 assert.equal(calls.length,1);
});
test('frontend has no keys or cookies and requires owner authorization',async()=>{
 assert.ok(cardActionsFor('levis').includes('products'));
 assert.deepEqual(cardActionsFor('gemini'),['inspect']);
 assert.match(browserStatus({state:'working',jobId:reqId}),/running/);
 let calls=0;
 await assert.rejects(callCardBrowser({action:'capabilities'}, {headers:async()=>({}),fetcher:async()=>{calls++}}),/Owner session/);
 assert.equal(calls,0);
 const code=fs.readFileSync(new URL('../quick-card-tinyfish-actions.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(code,/TINYFISH_API_KEY/);
 assert.match(code,/mountQuickCardTinyfishTools/);
});
