import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newLiveBitsState,advanceLiveBits,mountLiveView} from '../bubbles-live-iteration-feed.mjs';

const turn = () => advanceLiveBits(newLiveBitsState(),{type:'turn_started'});
test('an iteration begins with owner context; no fabricated actions or spendable credits',()=>{
 const s=turn();
 assert.equal(s.entries.length,1);
 assert.match(s.entries[0].headline,/context/i);
 assert.equal(s.credits,0);
 assert.equal(s.candidates,0);
});
test('context checked before receipts; separate user criteria produce unique reusable bit observations',()=>{
 let s=advanceLiveBits(turn(),{type:'memory',state:'retrieved'});
 s=advanceLiveBits(s,{type:'tool_receipt',tool:'github.read_file',status:'complete',receiptId:'receipt_git_0001',criteriaSummary:'Compare the QuantaPhi player and radio code',criteriaKey:'goal-A',resource:'www-infinity4/QuantaPhi'});
 s=advanceLiveBits(s,{type:'tool_receipt',tool:'github.read_file',status:'complete',receiptId:'receipt_git_0002',criteriaSummary:'Inspect a different repo for keyboard behavior',criteriaKey:'goal-B',resource:'www-infinity4/Keyboard'});
 assert.equal(s.candidates,2);
 assert.equal(s.credits,0);
 assert.ok(s.entries.some(e=>e.criteria==='Compare the QuantaPhi player and radio code'&&e.criteriaKey==='goal-A'));
 assert.ok(s.entries.some(e=>e.criteriaKey==='goal-B'));
 const again=advanceLiveBits(s,{type:'tool_receipt',tool:'github.read_file',status:'complete',receiptId:'receipt_git_0001'});
 assert.equal(again.candidates,2);
});
test('tool-start events are visible but must not be represented as completed',()=>{
 let s=turn();
 s=advanceLiveBits(s,{type:'tool_started',tool:'cloudflare.d1.create',operationId:'op-d1-000001',criteriaSummary:'Create an owner-approved catalog'});
 assert.match(s.entries.at(-1).headline,/Cloudflare.*D1/);
 assert.equal(s.entries.at(-1).state,'running');
 assert.equal(s.candidates,0);
 s=advanceLiveBits(s,{type:'tool_progress',tool:'cloudflare.d1.create',operationId:'op-d1-000001',detail:'Waiting for database confirmation'});
 assert.equal(s.entries.at(-1).state,'running');
 assert.equal(s.candidates,0);
});
test('failed results stay failed; unsupported tool strings do not create steps',()=>{
 let s=turn();
 s=advanceLiveBits(s,{type:'tool_receipt',tool:'cloudflare.d1.create',status:'failed',receiptId:'receipt_d1_0001'});
 assert.equal(s.entries.at(-1).state,'failed');
 assert.equal(s.candidates,0);
 const n=s.entries.length;
 s=advanceLiveBits(s,{type:'tool_started',tool:'evil.prompt',operationId:'bad-operation'});
 assert.equal(s.entries.length,n);
});
test('completion retains the visible history and switching conversations clears it',()=>{
 let s=advanceLiveBits(turn(),{type:'memory',state:'unavailable'});
 s=advanceLiveBits(s,{type:'turn_finished',failed:false});
 assert.match(s.live,/reply/i);
 assert.equal(s.entries.length,2);
 s=advanceLiveBits(s,{type:'session_changed'});
 assert.equal(s.entries.length,0);
 assert.equal(s.candidates,0);
});

test('the same live status line loads on every Bubbles website entrypoint without changing chat transport',()=>{
 const fs=requireSource();
 for(const page of ['index.html','bubbles.html','bubbles/index.html','bubbles-chrome.html']){
  const html=fs(page);
  assert.match(html,/bubbles-live-iteration-feed\.mjs\?v=20261106-inthread-iterations2/);
  assert.match(html,/bubbles-live-iteration-feed\.css\?v=20261106-inthread-iterations2/);
  assert.match(html,/bubbles-ai\.js\?v=20261106-bubbles-thread-iterations8/);
 }
 const module=fs('bubbles-live-iteration-feed.mjs');
 assert.match(module,/\.ba-panel \.ba-status|querySelector\('\.ba-panel'\)/,
  'Live iterations must mount on the actual body-mounted Bubbles chat, not #bubblesAICard');
 assert.match(module,/conversation\.append\(wrapper\)/,
  'Each iteration sequence must be part of the same chat transcript');
 assert.match(module,/bubbles:chat-user-visible/,
  "The first iteration should appear after the user's message");
 assert.doesNotMatch(module,/#bubblesAICard \.ba-status/,
  'The original selector never finds the detached messenger panel');
 assert.doesNotMatch(module,/fetch\(|localStorage|walletWrites|innerHTML/);
});
function requireSource(){
 return file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
}


test('signed Brain job steps appear one per recorded change, never as wallet credit',()=>{
 let s=advanceLiveBits(newLiveBitsState(),{type:'turn_started'});
 s=advanceLiveBits(s,{type:'job_step',source:'owner_ticket_snapshot',repository:'www-infinity4/QuantaPhi',
  agent:'greenbeans',status:'working',stage:'Fix Bubbles chat',summary:'Reading exact source and GitHub tests'});
 assert.match(s.live,/GitHub.*greenbeans.*working/i);
 assert.match(s.entries.at(-1).detail,/Reading exact source/);
 assert.equal(s.credits,0);
 assert.equal(s.candidates,0);
 const before=s.entries.length;
 s=advanceLiveBits(s,{type:'job_step',source:'unverified_model_text',repository:'www-infinity4/QuantaPhi',status:'deployed_verified'});
 assert.equal(s.entries.length,before);
});
test('repeated unchanged 15-second ticket polls must not look like new engineering',()=>{
 let s=newLiveBitsState();
 const evt={type:'job',repository:'www-infinity4/QuantaPhi',status:'working'};
 s=advanceLiveBits(s,evt);
 const n=s.entries.length;
 s=advanceLiveBits(s,evt);
 assert.equal(s.entries.length,n);
 s=advanceLiveBits(s,{...evt,status:'blocked'});
 assert.equal(s.entries.length,n+1);
});


test('the operator pulse shows actual commit, test, deployment and verification steps as distinct evidence',()=>{
 let s=advanceLiveBits(newLiveBitsState(),{type:'turn_started'});
 s=advanceLiveBits(s,{type:'memory',state:'retrieved'});
 const actions=[
  ['github.commit','receipt_commit_001','op_commit_001','Create a reviewed source commit'],
  ['github.workflow_checks','receipt_tests_002','op_tests_002','Verify the exact GitHub SHA'],
  ['cloudflare.worker.deploy','receipt_deploy_003','op_deploy_003','Deploy Cloudflare Worker'],
  ['cloudflare.worker.verify','receipt_verify_004','op_verify_004','Read active production version']
 ];
 for(const [tool,receiptId,operationId,criteriaSummary] of actions){
  s=advanceLiveBits(s,{type:'tool_started',tool,operationId,criteriaSummary});
  assert.equal(s.entries.at(-1).state,'running',tool);
  s=advanceLiveBits(s,{type:'tool_receipt',tool,operationId,status:'complete',
   receiptId,criteriaSummary,resource:'www-infinity4/QuantaPhi'});
  assert.equal(s.entries.at(-1).state,'complete',tool);
  assert.equal(s.entries.at(-1).evidenceKind,'technical_execution',tool);
 }
 assert.equal(s.candidates,4,'one observed step per distinct receipt, no repeated polling credit');
 assert.equal(s.credits,0,'never confuse Gits accounting with spendable user Bits');
 assert.equal(s.entries.filter(x=>x.tool==='cloudflare.worker.verify').length,1);
 const once=advanceLiveBits(s,{type:'tool_receipt',tool:'cloudflare.worker.verify',
  operationId:'op_verify_004',status:'complete',receiptId:'receipt_verify_004'});
 assert.equal(once.candidates,4);
 assert.equal(once.entries.length,s.entries.length);
});
test('a failed deployment does not become completion, wallet credit or operator Gits',()=>{
 let s=advanceLiveBits(newLiveBitsState(),{type:'turn_started'});
 s=advanceLiveBits(s,{type:'memory',state:'retrieved'});
 s=advanceLiveBits(s,{type:'tool_started',tool:'cloudflare.worker.deploy',
  operationId:'op_failed_deploy_01',criteriaSummary:'Deploy Bubbles Brain safely'});
 s=advanceLiveBits(s,{type:'tool_receipt',tool:'cloudflare.worker.deploy',
  operationId:'op_failed_deploy_01',status:'failed',receiptId:'receipt_failed_deploy_01'});
 assert.equal(s.entries.at(-1).state,'failed');
 assert.equal(s.candidates,0);
 assert.equal(s.credits,0);
 assert.doesNotMatch(JSON.stringify(s),/spendableCredits|GitsMinted/);
});


test('the pulse never calls a technical operation complete without a receipt ID',()=>{
 let s=advanceLiveBits(newLiveBitsState(),{type:'turn_started'});
 s=advanceLiveBits(s,{type:'memory',state:'retrieved'});
 s=advanceLiveBits(s,{type:'tool_started',tool:'cloudflare.worker.deploy',operationId:'op_noreceipt_001'});
 s=advanceLiveBits(s,{type:'tool_receipt',tool:'cloudflare.worker.deploy',operationId:'op_noreceipt_001',
  status:'complete',detail:'The model says deployment succeeded'});
 assert.equal(s.entries.at(-1).state,'unverified');
 assert.equal(s.candidates,0);
 assert.equal(s.credits,0);
});


test('authenticated direct GitHub read displays real start and pending states without minting a receipt',async()=>{
 const vm=await import('node:vm');
 const source=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 const begin=source.indexOf('function publishDirectGithubIteration(');
 const end=source.indexOf("\ninput.addEventListener('keydown'",begin);
 assert.ok(begin>0&&end>begin,'the real Bubbles GitHub adapter must publish iterations');
 const events=[];
 const ctx={
  embedded:false,activeThread:'conversation-A',currentBitContext:null,
  verifiedOwnerHeaders:async()=>({Authorization:'Bearer synthetic-owner'}),
  BRAIN:'https://brain.fixture',crypto:{randomUUID:()=> '11111111-1111-4111-8111-111111111111'},
  CustomEvent:class{constructor(name,{detail}){this.detail=detail;}},
  window:{dispatchEvent:event=>events.push(event.detail)},
  bubblesFetch:async()=>({ok:true,json:async()=>({ok:true,status:'working'})}),
  watchDirectGithubReceipt:()=>{}
 };
 vm.createContext(ctx);
 vm.runInContext(source.slice(begin,end)+'\nthis.runDirect=directGithubOperation;',ctx);
 const answer=await ctx.runDirect({action:'read_file',repository:'www-infinity4/QuantaPhi',path:'bubbles-ai.js'},{ownerRequest:'Inspect real chat source'});
 assert.equal(answer.status,'working');
 assert.deepEqual(events.map(event=>event.type),['tool_started','tool_progress']);
 assert.ok(events.every(event=>event.tool==='github.read_file'));
 assert.equal(events[0].operationId,events[1].operationId);
 assert.ok(!events.some(event=>event.type==='tool_receipt'));
 let s=advanceLiveBits(newLiveBitsState(),{type:'memory',state:'retrieved'});
 for(const event of events)s=advanceLiveBits(s,event);
 assert.equal(s.entries.filter(entry=>entry.tool==='github.read_file').length,1,'the same real operation updates one status line');
 assert.equal(s.entries.find(entry=>entry.tool==='github.read_file').state,'running');
 assert.equal(s.candidates,0);
 assert.equal(s.credits,0);
});

test('direct GitHub read reports server receipt only for matching verified backend evidence',async()=>{
 const vm=await import('node:vm');
 const source=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 const begin=source.indexOf('function publishDirectGithubIteration(');
 const end=source.indexOf("\ninput.addEventListener('keydown'",begin);
 assert.ok(begin>0&&end>begin);
 const events=[];
 let backend={ok:true,status:'inspected',receipt:{id:'real_github_receipt_12345678',tool:'github.read_file',status:'complete'}};
 const ctx={
  embedded:false,activeThread:'conversation-A',currentBitContext:null,
  verifiedOwnerHeaders:async()=>({Authorization:'Bearer synthetic-owner'}),
  BRAIN:'https://brain.fixture',crypto:{randomUUID:()=> '22222222-2222-4222-8222-222222222222'},
  CustomEvent:class{constructor(name,{detail}){this.detail=detail;}},
  window:{dispatchEvent:event=>events.push(event.detail)},
  bubblesFetch:async()=>({ok:true,json:async()=>backend}),
  watchDirectGithubReceipt:()=>{}
 };
 vm.createContext(ctx);
 vm.runInContext(source.slice(begin,end)+'\nthis.runDirect=directGithubOperation;',ctx);
 const op={action:'read_file',repository:'www-infinity4/QuantaPhi',path:'bubbles-ai.js'};
 await ctx.runDirect(op,{ownerRequest:'Inspect real chat source'});
 assert.deepEqual(events.map(event=>event.type),['tool_started','tool_receipt']);
 assert.equal(events.at(-1).status,'complete');
 assert.equal(events.at(-1).receiptId,'real_github_receipt_12345678');
 let s=advanceLiveBits(newLiveBitsState(),{type:'memory',state:'retrieved'});
 for(const event of events)s=advanceLiveBits(s,event);
 assert.equal(s.candidates,1);
 assert.equal(s.credits,0);
 events.length=0;
 backend={ok:true,status:'inspected',receipt:{id:'wrong_tool_receipt_12345678',tool:'web.search',status:'complete'}};
 await ctx.runDirect(op,{ownerRequest:'Inspect real chat source'});
 assert.equal(events.at(-1).status,'unverified','a receipt from another tool is not valid evidence');
 assert.equal(events.at(-1).receiptId,undefined);
 events.length=0;
 backend={ok:true,status:'inspected'};
 await ctx.runDirect(op,{ownerRequest:'Inspect real chat source'});
 assert.equal(events.at(-1).status,'unverified','text-only outcome is not a verified tool receipt');
});

test('live GitHub receipts appear even while Bubble Bit wallet issuance stays disabled',async()=>{
 const {githubIteration}=await import('../workers/infinity-brain-clock/iteration-credit.mjs');
 const ownerHash='a'.repeat(64),requestId='11111111-1111-4111-8111-111111111111';
 const receipt=await githubIteration({WRITER_OWNER_HASH:ownerHash,BUBBLE_BITS_ENABLED:'0'},
  {requestId,bitContext:null},{ok:true,status:'runs_read_only',runs:[]},
  {action:'list_runs',repository:'www-infinity4/TestPilot'},0);
 assert.equal(receipt.receipt.tool,'github.list_runs');
 assert.equal(receipt.receipt.status,'complete');
 assert.equal(receipt.credit,undefined,'Display receipts never mint wallet currency');
 assert.equal(receipt.bit.status,'context_unavailable');
 const source=readFileSync(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8');
 const marker=source.indexOf('const saveReceipt=async (receipt,operation=body)=>{');
 const end=source.indexOf('record.receipts.push(metadata);',marker);
 assert.ok(marker>0&&end>marker);
 assert.doesNotMatch(source.slice(marker,end),/if\(this\.env\.BUBBLE_BITS_ENABLED==='1'\)/,
  'Brain must record real tool receipts regardless of the credit flag');
});

test('the messenger emits a user-visible chat turn before showing its sequential iterations',()=>{
 const source=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 assert.match(source,/new CustomEvent\('bubbles:chat-user-visible'/);
 assert.match(source,/publishDirectGithubIteration\(operation,requestId,'tool_started'/);
 assert.match(source,/assist:'github\.assist'/);
});


test('real Bubbles messenger mounts iteration rows in the conversation after the user message',()=>{
 class Node{
  constructor(){this.children=[];this.textContent='';this.className='';this.attributes={};this.isConnected=false;}
  setAttribute(k,v){this.attributes[k]=v;}
  append(...items){for(const item of items){item.isConnected=true;this.children.push(item);}}
  replaceChildren(...items){this.children=[];this.append(...items);}
  after(element){this.afterElement=element;element.isConnected=true;}
 }
 const status=new Node(),conversation=new Node();
 const panel={querySelector:selector=>selector==='.ba-status'?status:selector==='.ba-messages'?conversation:selector==='.ba-current-iteration'?null:null};
 const doc={querySelector:selector=>selector==='.ba-panel'?panel:null,createElement:()=>new Node()};
 const view=mountLiveView(doc);
 assert.ok(view,'The body-mounted messenger is discoverable without #bubblesAICard');
 assert.equal(view.show instanceof Function,true);
 view.begin();
 assert.equal(conversation.children.length,0,'Opening a turn does not put iterations above the user message');
 // Simulate Bubbles displaying the user's message before the first iteration.
 const userMessage=new Node();conversation.append(userMessage);
 let state=advanceLiveBits(newLiveBitsState(),{type:'turn_started'});
 state=advanceLiveBits(state,{type:'memory',state:'retrieved'});
 view.show(state);
 assert.equal(conversation.children[0],userMessage);
 const current=conversation.children[1];
 assert.match(current.attributes['aria-label'],/this chat message/);
 assert.ok(current.children[1].children.length>=2,'One live line per distinct iteration');
 assert.match(status.afterElement.textContent,/Iteration/);
 state=advanceLiveBits(state,{type:'tool_started',tool:'github.assist',
  operationId:'aaa11111-1111-4111-8111-111111111111',resource:'www-infinity4/TestPilot'});
 view.show(state);
 assert.equal(current.children[1].children.length,3);
 state=advanceLiveBits(state,{type:'tool_receipt',tool:'github.assist',
  operationId:'aaa11111-1111-4111-8111-111111111111',status:'unverified'});
 view.show(state);
 assert.equal(current.children[1].children.length,3,'A tool state change updates its row rather than inventing another iteration');
 assert.equal(state.credits,0);
});
