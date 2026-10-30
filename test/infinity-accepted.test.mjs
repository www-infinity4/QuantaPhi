import test from 'node:test';
import assert from 'node:assert/strict';
import {INFINITY_ACCEPTED_BRANDS,ACCEPTED_GROUPS,acceptedBrand,isInfinityAccepted,hasAcceptedSource} from '../infinity-accepted-catalog.mjs';
import {cleanFeedState,feedCandidates,nextFeedDirection,nextDeckCycle,markViewed} from '../quanta-feed-rank.mjs';
import {planCardBrowserAction,cardActionGoal} from '../workers/infinity-brain-clock/quick-card-browser-policy.mjs';
import {handleQuickCardBrowser,readBoundedJson} from '../workers/infinity-brain-clock/quick-card-browser.mjs';
import {createCardBrowserSession} from '../quick-card-tinyfish-actions.mjs';
import {cardImageCandidates,acceptedFeaturedProduct,ACCEPTED_FEATURED_PRODUCTS} from '../infinity-accepted-cards.mjs';
import {websiteSummary} from '../tinyfish-card-reader.mjs';
const framework=acceptedBrand('durable-framework-computers');
const other={id:'ordinary',name:'Ordinary brand',official:'https://example.com/',category:'Hardware'};
const store=()=>{const map=new Map();return {get:async key=>map.get(key),put:async(key,value)=>map.set(key,structuredClone(value))}};
const env={TINYFISH_API_KEY:'synthetic-provider-fixture-key'};
test('still images keep observed fallbacks and exclude unsafe or animated media',()=>{
 assert.deepEqual(cardImageCandidates({images:['https://example.com/product.jpg','https://example.com/product.jpg','https://example.com/moving.gif','javascript:alert(1)','https://user:password@example.com/private.jpg'],logo:'https://example.com/logo.svg'}),
  ['https://example.com/product.jpg','https://example.com/logo.svg']);
 const starrett=acceptedBrand('durable-starrett');assert.match(starrett.image,/thread-gaging/);
 assert.match(starrett.feature,/calipers/);assert.deepEqual(starrett.actions.map(a=>a.label),['Thread gages','Saw blades']);
});
test('compact website results present source prose without raw Markdown or hidden product loss',()=>{
 const text='# Tools\n\nShort heading\n\nA detailed product description with enough words to explain the original website offering clearly.\n\n[Original product](https://example.com/product)';
 const summary=websiteSummary(text);assert.match(summary.lead,/^A detailed product description/);
 assert.doesNotMatch(summary.full,/#|\]\(/);assert.match(summary.full,/Original product/);
 assert.ok(websiteSummary('a'.repeat(2000)).lead.length<=600);
});
test('preserves all 116 owner entries, four categories and specific model qualifiers',()=>{
 assert.equal(INFINITY_ACCEPTED_BRANDS.length,116);assert.equal(new Set(INFINITY_ACCEPTED_BRANDS.map(x=>x.id)).size,116);
 assert.deepEqual(ACCEPTED_GROUPS.map(group=>INFINITY_ACCEPTED_BRANDS.filter(x=>x.category===group).length),[29,22,45,20]);
 assert.equal(acceptedBrand('durable-thinkpad-classic-t-series').name,'ThinkPad (Classic/T-Series)');
 assert.equal(acceptedBrand('durable-casio-g-shock-classic-line').name,'Casio (G-Shock/Classic Line)');
 assert.ok(INFINITY_ACCEPTED_BRANDS.every(c=>c.acceptedBy==='catalog-owner'&&c.infinityAccepted));
 assert.ok(!hasAcceptedSource(acceptedBrand('durable-ronson')),'a held source must not enable automated actions');
});
test('each enabled button maps to a trusted observed HTTPS website destination',()=>{
 for(const card of INFINITY_ACCEPTED_BRANDS.filter(hasAcceptedSource))for(const action of card.actions){
  const plan=planCardBrowserAction({cardId:card.id,action:action.id});
  assert.equal(plan.url,action.url,card.name+' '+action.id);assert.equal(plan.useProfile,false);
  const url=new URL(plan.url);assert.equal(url.protocol,'https:');assert.equal(url.username,'');
  assert.match(cardActionGoal(plan),/Limit this action.*brand\/model scope/);
 }
 for(const cardId of ['constructor','__proto__','toString'])assert.throws(()=>planCardBrowserAction({cardId,action:'inspect'}),/unknown_card/);
 assert.throws(()=>planCardBrowserAction({cardId:framework.id,action:'checkout'}),/not_approved/);
 assert.throws(()=>planCardBrowserAction({cardId:'durable-ronson',action:'inspect'}),/not_approved/);
});
test('accepted priority applies in each feed, while Following and unseen rotation remain strict',()=>{
 const accepted=INFINITY_ACCEPTED_BRANDS.filter(hasAcceptedSource).slice(0,3),cards=[other,...accepted];
 let state=cleanFeedState({following:[other.id,accepted[0].id],counts:{ordinary:5000}});
 for(const tab of ['public','for-you','following'])assert.equal(feedCandidates(cards,tab,state)[0].id,accepted[0].id);
 assert.equal(feedCandidates(cards,'following',state).length,2);
 const spoof={...other,infinityAccepted:true};assert.equal(isInfinityAccepted(spoof),false);
 assert.equal(isInfinityAccepted({...framework,official:'https://evil.example/'}),false);
 let current='',seen=new Set(),visited=[];
 for(let i=0;i<cards.length;i++){
  const round=nextDeckCycle(cards,current,seen),pick=nextFeedDirection(round.cards,'public',state,current).card;
  visited.push(pick.id);seen=round.seen;seen.add(pick.id);current=pick.id;state=markViewed(state,pick.id);
 }
 assert.equal(new Set(visited).size,cards.length);assert.equal(visited.at(-1),other.id);
 assert.equal(nextDeckCycle(cards,current,seen).restarted,true);
});
test('public brand browser read uses no saved profile and binds duplicate IDs to the original action',async()=>{
 const storage=store(),calls=[],requestId=crypto.randomUUID();
 const action=framework.actions[0];
 const send=async(url,init)=>{calls.push({url,init});return Response.json({run_id:crypto.randomUUID()})};
 const body={action:'start',cardId:framework.id,kind:action.id,requestId};
 const first=await handleQuickCardBrowser(storage,env,body,send);assert.equal(first.httpStatus,202);
 const wire=JSON.parse(calls[0].init.body);assert.equal(wire.url,action.url);assert.equal(wire.use_profile,undefined);assert.equal(wire.profile_id,undefined);
 const repeat=await handleQuickCardBrowser(storage,env,body,send);assert.equal(repeat.result.job.jobId,first.result.job.jobId);assert.equal(calls.length,1);
 const conflict=await handleQuickCardBrowser(storage,env,{...body,query:'different task'},send);assert.equal(conflict.httpStatus,409);assert.equal(calls.length,1);
 const unconfigured=await handleQuickCardBrowser(store(),{},body,send);assert.equal(unconfigured.httpStatus,503);assert.equal(calls.length,1);
});
test('uncertain client start recovers using the same request ID, and running jobs prevent duplicate taps',async()=>{
 const requests=[];let fail=true;
 const session=createCardBrowserSession(framework.id,async body=>{
  requests.push(body);if(fail){fail=false;throw Error('connection lost')}
  return {ok:true,job:{jobId:'fixture-job',state:body.action==='status'?'completed_browser_read':'working'}};
 });
 await assert.rejects(session.start(framework.actions[0].id),/connection lost/);
 assert.equal(session.job.state,'dispatch_uncertain');await assert.rejects(session.start('parts'),/existing browser/);
 await session.check();assert.equal(requests[1].requestId,requests[0].requestId);
 await assert.rejects(session.start('parts'),/existing browser/);assert.equal(requests.length,2);
 await session.check();assert.equal(requests[2].action,'status');assert.equal(session.job.state,'completed_browser_read');
});
test('bounded upstream JSON cancels oversized streams and never buffers an unlimited response',async()=>{
 let cancelled=false;
 const response=new Response(new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(100))},cancel(){cancelled=true}}));
 await assert.rejects(readBoundedJson(response,150),/oversize/);assert.equal(cancelled,true);
 const parsed=await readBoundedJson(Response.json({ok:true}));assert.equal(parsed.ok,true);
});
test('a finished provider run with no same-brand links does not claim a completed website read',async()=>{
 const storage=store(),body={action:'start',cardId:framework.id,kind:framework.actions[0].id,requestId:crypto.randomUUID()};
 const begin=await handleQuickCardBrowser(storage,env,body,async()=>Response.json({run_id:crypto.randomUUID()}));
 const result=await handleQuickCardBrowser(storage,env,{action:'status',jobId:begin.result.job.jobId},async()=>Response.json({status:'COMPLETED',result:{summary:'No source evidence',items:[null,{}, {name:'Off-site',url:'https://evil.example/'}]}}));
 assert.equal(result.result.job.state,'unverified_browser_result');assert.equal(result.result.job.report.verifiedSameSiteLinks,0);
});

test('three owner-cited product spotlights use real SKUs, attributable photographs and official retailer handoffs',()=>{
 for(const id of ['durable-goruck','durable-filson','durable-thule']){
  const card=acceptedBrand(id),item=acceptedFeaturedProduct(card);
  assert.ok(item,id+' missing');
  assert.ok(item.title.length>12);
  assert.match(item.imageUrl,/^https:\/\//);
  assert.ok(new URL(item.productUrl).hostname.endsWith(new URL(card.official).hostname.replace(/^www\./,'')));
  assert.match(item.imageCredit,/Product photo:/);
  assert.equal(item.checked,'2026-10-30');
 }
 assert.equal(Object.keys(ACCEPTED_FEATURED_PRODUCTS).length,3);
 assert.equal(acceptedFeaturedProduct({...acceptedBrand('durable-thule'),official:'https://wrong.example/'}),null);
 assert.equal(acceptedFeaturedProduct({id:'ordinary',official:'https://example.org/'}),null);
 assert.match(ACCEPTED_FEATURED_PRODUCTS['durable-thule'].availability,/unconfirmed/);
});
