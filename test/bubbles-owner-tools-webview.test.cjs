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
test('ticket create, update and runner calls work without AbortSignal.timeout',async()=>{
 const calls=[],ticket={id:'test-receipt',status:'draft',context:{}};
 const ctx={activeCardEvidence:null,repositorySelection:new Set(['www-infinity4/QuantaPhi']),repositoryPicker:{dataset:{}},AbortSignal:{},AbortController,setTimeout,clearTimeout,crypto:webcrypto,TextEncoder,brainTools,
  verifiedOwnerHeaders:async()=>({Authorization:'Bearer test-fixture-only'}),
  BRAIN:'https://brain.test',TICKETS:'https://brain.test',workButton:{disabled:false},workStatus:{},workText:{},location:{origin:'https://quantaphi.org',pathname:'/bubbles.html'},config:{role:'assistant'},
  window:{dispatchEvent:()=>{}},CustomEvent:class{},
  fetch:async(url,options)=>{calls.push({url,options});assert.ok(options.signal instanceof AbortSignal);
   const body=url.endsWith('/create')?{ok:true,ticket}:url.endsWith('/update')?{ok:true}:{ok:true,status:'queued_for_runner'};
   return {ok:true,json:async()=>body};}};
 vm.createContext(ctx);vm.runInContext(helper+cut('async function requestRunner(', '\nworkButton.addEventListener'),ctx);
 const receipt=await ctx.submitWork('Repair Bubbles screen recording','explicit-user-command');
 assert.equal(receipt.id,'test-receipt');assert.equal(receipt.runner,'queued_for_runner');
 assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/work/tickets/create','/work/tickets/update','/work/run-next']);
 const updated=JSON.parse(calls[1].options.body);assert.equal(updated.status,'ready');assert.equal(updated.context.color_jobs.length,2);
 assert.equal(ctx.workButton.disabled,false);
});
test('bounded network timeout aborts and propagates a real failure',async()=>{
 const ctx={AbortSignal:{},AbortController,setTimeout,clearTimeout,
  fetch:(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('aborted'))))};
 vm.createContext(ctx);vm.runInContext(helper,ctx);
 await assert.rejects(ctx.bubblesFetch('https://brain.test',{},5),/aborted/);
});
test('all Bubbles owner paths use the compatible helper',()=>{
 assert.doesNotMatch(site,/signal:AbortSignal\.timeout/);
 for(const endpoint of ['/work/tickets/list','/work/tickets/create','/work/tickets/update','/work/run-next','/owner/conversation','/owner/pair/create'])
  assert.ok(site.includes("bubblesFetch(BRAIN+'"+endpoint+"'")||site.includes("bubblesFetch(TICKETS+'"+endpoint+"'"),endpoint);
});
