const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const brainTools=require('../bubbles-brain-actions.js');
const site=fs.readFileSync('bubbles-ai.js','utf8');
const cut=(a,b)=>site.slice(site.indexOf(a),site.indexOf(b,site.indexOf(a)));
const helper=cut('async function bubblesFetch(', 'const params=');
test('capability question checks connection; concrete work ticket requests dispatch; refusals stay chat',()=>{
 assert.equal(brainTools.classify('can you start work tickets'),'connection');
 assert.equal(brainTools.classify('Can you start work tickets to repair Bubbles recording?'),'queue');
 assert.equal(brainTools.classify('Show the status of work tickets'),'report');
 assert.equal(brainTools.classify('Do not start work tickets to repair Bubbles'),'chat');
});
test('atomic ticket submission works without AbortSignal.timeout and has no duplicate runner request',async()=>{
 const calls=[],ticket={id:'test-receipt',status:'draft',context:{}};
 const ctx={activeCardEvidence:null,repositorySelectionExplicit:true,repositorySelection:new Set(['www-infinity4/QuantaPhi']),repositoryPicker:{dataset:{}},Response,AbortSignal:{},AbortController,setTimeout,clearTimeout,crypto:webcrypto,TextEncoder,brainTools,
  verifiedOwnerHeaders:async()=>({Authorization:'Bearer test-fixture-only'}),
  BRAIN:'https://brain.test',TICKETS:'https://brain.test',workButton:{disabled:false},workStatus:{},workText:{},location:{origin:'https://quantaphi.org',pathname:'/bubbles.html'},config:{role:'assistant'},
  window:{dispatchEvent:()=>{}},CustomEvent:class{},pollBrainProgress:async()=>{},
  fetch:async(url,options)=>{calls.push({url,options});assert.ok(options.signal instanceof AbortSignal);
   const body=url.endsWith('/create')?{ok:true,ticket,execution:{status:'queued_for_runner'}}:url.endsWith('/update')?{ok:true}:{ok:true,status:'queued_for_runner'};
   return Response.json(body);}};
 vm.createContext(ctx);vm.runInContext(helper+cut('async function requestRunner(', '\nworkButton.addEventListener'),ctx);
 const receipt=await ctx.submitWork('Repair Bubbles screen recording','explicit-user-command');
 assert.equal(receipt.id,'test-receipt');assert.equal(receipt.runner,'queued_for_runner');
 assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/work/tickets/create']);
 const submitted=JSON.parse(calls[0].options.body);assert.equal(submitted.start_immediately,true);assert.equal(submitted.context.color_jobs.length,2);
 assert.equal(ctx.workButton.disabled,false);
});
test('bounded network timeout aborts and propagates a real failure',async()=>{
 const ctx={AbortSignal:{},AbortController,setTimeout,clearTimeout,
  fetch:(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('aborted'))))};
 vm.createContext(ctx);vm.runInContext(helper,ctx);
 await assert.rejects(ctx.bubblesFetch('https://brain.test',{},5),/timed out|aborted/);
});
test('response headers do not end the deadline while the body stalls',async()=>{
 let signal;
 const ctx={Response,AbortController,setTimeout,clearTimeout,
  fetch:async(_,options)=>{signal=options.signal;return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{"ok":'));}}),{headers:{'content-type':'application/json'}});}};
 vm.createContext(ctx);vm.runInContext(helper,ctx);
 await assert.rejects(ctx.bubblesFetch('https://brain.test',{},10),/timed out.*unverified/);
 assert.equal(signal.aborted,true);
 // A later request still returns its real receipt after the stalled request.
 ctx.fetch=async()=>Response.json({ok:true,requestId:'next-receipt'});
 const next=await ctx.bubblesFetch('https://brain.test',{},1000);
 assert.deepEqual(await next.json(),{ok:true,requestId:'next-receipt'});
});
test('a completed error body preserves status and receipt; no-content stays bodyless',async()=>{
 const ctx={Response,AbortController,setTimeout,clearTimeout,fetch:async()=>Response.json({error:'owner_required'},{status:401,headers:{'x-request-id':'failure-receipt'}})};
 vm.createContext(ctx);vm.runInContext(helper,ctx);
 const response=await ctx.bubblesFetch('https://brain.test',{},1000);
 assert.equal(response.status,401);assert.equal(response.ok,false);
 assert.equal(response.headers.get('x-request-id'),'failure-receipt');
 assert.deepEqual(await response.json(),{error:'owner_required'});
 ctx.fetch=async()=>new Response(null,{status:204});
 const empty=await ctx.bubblesFetch('https://brain.test',{},1000);
 assert.equal(empty.status,204);assert.equal(empty.body,null);
});
test('stalled GitHub response recovers by the original receipt ID without resubmitting work',async()=>{
 const watched=[],calls=[];
 const ctx={Response,AbortController,setTimeout:(fn,ms)=>setTimeout(fn,Math.min(ms,10)),clearTimeout,
  embedded:false,BRAIN:'https://brain.test',crypto:webcrypto,
  verifiedOwnerHeaders:async()=>({Authorization:'Bearer test-fixture-only'}),
  watchDirectGithubReceipt:id=>watched.push(id),
  fetch:async(url,options)=>{calls.push(JSON.parse(options.body));return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{'));}}));}};
 vm.createContext(ctx);
 vm.runInContext(helper+cut('async function directGithubOperation(', '\ninput.addEventListener'),ctx);
 const result=await ctx.directGithubOperation({action:'assist',requestId:'original-job-id',repository:'www-infinity4/QuantaPhi'});
 assert.equal(result.status,'unconfirmed');assert.equal(result.requestId,'original-job-id');
 assert.match(result.next,/durable receipt/);
 assert.deepEqual(watched,['original-job-id']);assert.equal(calls.length,1);
 assert.equal(calls[0].requestId,'original-job-id');
});
test('all Bubbles owner paths use the compatible helper',()=>{
 assert.doesNotMatch(site,/signal:AbortSignal\.timeout/);
 for(const endpoint of ['/work/tickets/list','/work/tickets/create','/work/run-next','/owner/conversation','/owner/pair/create'])
  assert.ok(site.includes("bubblesFetch(BRAIN+'"+endpoint+"'")||site.includes("bubblesFetch(TICKETS+'"+endpoint+"'"),endpoint);
});
