import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {isGithubReceiptFollowup,githubReceiptFollowupReply} from '../bubbles-github-receipt-followup.mjs';
const site=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
test('questions about a previous repo write read its receipt rather than requesting a new write',()=>{
 for(const question of ['Did GitHub respond?','Does that mean yes it created a repo?','Was test-pilot created?','Has GitHub replied?','GitHub status?'])assert.equal(isGithubReceiptFollowup(question),true,question);
 for(const instruction of ['Can you create a repo named test pilot?','Create a repo named test pilot','Fix GitHub integration','How do GitHub actions work?','Did GitHub respond? Also delete my files'])assert.equal(isGithubReceiptFollowup(instruction),false,instruction);
});
test('missing, pending or blocked reports never become a fabricated success',()=>{
 assert.match(githubReceiptFollowupReply({ok:false,error:'receipt_not_found'}),/no saved completion receipt/i);
 assert.match(githubReceiptFollowupReply({ok:true,status:'working'}),/still processing/i);
 assert.match(githubReceiptFollowupReply({ok:true,status:'unconfirmed'}),/not yet verified/i);
 assert.doesNotMatch(githubReceiptFollowupReply({ok:false,status:'repository_created'}),/confirmed that it created/);
});
test('a valid owner-scoped repository-created reply includes the saved GitHub URL',()=>{
 const created={ok:true,status:'repository_created',repository:'www-infinity4/test-pilot',url:'https://github.com/www-infinity4/test-pilot'};
 assert.match(githubReceiptFollowupReply(created),/www-infinity4\/test-pilot/);
 assert.match(githubReceiptFollowupReply(created,undefined,'Was another-pilot created?'),/another-pilot is unverified/);
 assert.doesNotMatch(githubReceiptFollowupReply({ok:true,status:'repository_created',repository:'elsewhere/private',url:'https://elsewhere.invalid/fake'}),/confirmed that it created/);
});

test('site routes a saved GitHub response question before normal repo-creation intent',()=>{
 const src=site;
 const statusRoute=src.indexOf('receiptModule?.isGithubReceiptFollowup(spoken)');
 const createRoute=src.indexOf('const createRepository=');
 assert.ok(statusRoute>0&&statusRoute<createRoute);
 assert.match(src,/githubReceipt\(recent\.requestId\)/);
 assert.match(src,/rememberRecentGithubWork\(requestId,receiptThread\)/);
 assert.match(src,/create_repository:'github\.create_repository'/);
});
test('ordinary chat mounts its iteration trail before GitHub routing and honors explicit private visibility',()=>{
 const ordinary=site.slice(site.lastIndexOf("display(spoken,'you')",site.indexOf('// This acknowledgement')),
  site.indexOf('// This acknowledgement'));
 assert.match(ordinary,/display\(spoken,'you'\)[\s\S]*?bubbles:chat-user-visible/);
 const begin=site.indexOf('const repoCreateQualifiers=');
 const end=site.indexOf('const directRequest=',begin);
 const visibility=site.match(/if\(action==='create_repository'&&.*\)args\.private=true;/)?.[0];
 assert.ok(visibility);
 const plan=vm.runInNewContext(`(request=>{${site.slice(begin,end)}; const action=createRepository?'create_repository':'assist'; const args={action}; ${visibility} return args;})`);
 assert.equal(plan('Please create a private GitHub repository called Bubbles-QA').private,true);
 assert.equal(plan('Create a GitHub repository named Bubbles-QA with private visibility.').private,true);
 assert.equal(plan('Create a public GitHub repo called Bubbles-QA').private,undefined);
 assert.equal(plan('Create a GitHub repo called Bubbles-QA').action,'create_repository');
 assert.equal(plan('How do I create a private repo?').action,'assist');
});
test('receipt polling starts in the original chat even when the GitHub response is delayed',async()=>{
 const start=site.indexOf('async function directGithubOperation(');
 const end=site.indexOf("\ninput.addEventListener('keydown'",start);
 const watched=[],saved=[],requests=[];
 let reply;
 const waiting=new Promise(resolve=>{reply=resolve;});
 const context={embedded:false,activeThread:'original-chat',crypto:{randomUUID:()=> '11111111-1111-4111-8111-111111111111'},
  verifiedOwnerHeaders:async()=>({Authorization:'Bearer synthetic-owner'}),BRAIN:'https://brain.fixture',
  rememberRecentGithubWork:(id,thread)=>saved.push([id,thread]),watchDirectGithubReceipt:(...args)=>watched.push(args),
  bubblesFetch:async(_,options)=>{requests.push(JSON.parse(options.body));return waiting;}};
 vm.runInNewContext(site.slice(start,end),context);
 const sending=context.directGithubOperation({action:'create_repository',repository:'www-infinity4/Bubbles-QA',private:true});
 context.activeThread='another-chat';
 reply({ok:true,json:async()=>({ok:true,status:'working'})});
 await sending;
 assert.equal(requests[0].sessionId,'original-chat');
 assert.equal(requests[0].private,true);
 assert.equal(saved[0][1],'original-chat');
 assert.equal(watched[0][4],'original-chat');
});
test('creation remains a live iteration after the chat reply, without fabricated bits',async()=>{
 const {newLiveBitsState,advanceLiveBits}=await import('../bubbles-live-iteration-feed.mjs');
 let s=advanceLiveBits(newLiveBitsState(),{type:'turn_started'});
 s=advanceLiveBits(s,{type:'memory',state:'retrieved'});
 const entry={tool:'github.create_repository',operationId:'11111111-1111-4111-8111-111111111111',criteriaSummary:'Create test-pilot'};
 s=advanceLiveBits(s,{type:'tool_started',...entry});
 assert.equal(s.entries.at(-1).state,'running');
 s=advanceLiveBits(s,{type:'turn_finished',failed:false});
 assert.match(s.live,/waiting for saved execution receipt/i);
 s=advanceLiveBits(s,{type:'tool_receipt',...entry,status:'unverified'});
 assert.equal(s.entries.at(-1).state,'unverified');
 assert.equal(s.candidates,0);
 assert.equal(s.credits,0);
});
