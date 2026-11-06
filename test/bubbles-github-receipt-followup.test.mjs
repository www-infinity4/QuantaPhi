import test from 'node:test';
import assert from 'node:assert/strict';
import {isGithubReceiptFollowup,githubReceiptFollowupReply} from '../bubbles-github-receipt-followup.mjs';
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
 assert.match(githubReceiptFollowupReply({ok:true,status:'repository_created',repository:'www-infinity4/test-pilot',url:'https://github.com/www-infinity4/test-pilot'}),/www-infinity4\/test-pilot/);
 assert.doesNotMatch(githubReceiptFollowupReply({ok:true,status:'repository_created',repository:'elsewhere/private',url:'https://elsewhere.invalid/fake'}),/confirmed that it created/);
});

test('site routes a saved GitHub response question before normal repo-creation intent',async()=>{
 const {readFileSync}=await import('node:fs');
 const src=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 const statusRoute=src.indexOf('receiptModule?.isGithubReceiptFollowup(spoken)');
 const createRoute=src.indexOf('const createRepository=');
 assert.ok(statusRoute>0&&statusRoute<createRoute);
 assert.match(src,/githubReceipt\(recent\.requestId\)/);
 assert.match(src,/rememberRecentGithubWork\(requestId,receiptThread\)/);
 assert.match(src,/create_repository:'github\.create_repository'/);
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
