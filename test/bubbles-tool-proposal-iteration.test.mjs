import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {newLiveBitsState,advanceLiveBits} from '../bubbles-live-iteration-feed.mjs';

function replyGuard(){
 const source=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 const start=source.indexOf('function isUnexecutedJobStatusProposal(');
 const end=source.indexOf('function isOwnerWorkRequest(',start);
 assert.ok(start>0&&end>start,'Bubbles must recognize an unexecuted model job-status proposal');
 const sandbox={};
 vm.runInNewContext(source.slice(start,end)+
  '\nthis.detect=isUnexecutedJobStatusProposal;this.normalize=normalizeOwnerAssistantReply;',sandbox);
 return sandbox;
}
const screenshotReply='We need to issue a tool request.\n{\n "action": "check_job_status",\n "parameters": {\n "repo": "www-infinity4/Chiller",\n "branch": "add-full-episodes"\n }\n}';

test('Chiller JSON tool proposal never appears as an executed action or raw JSON',()=>{
 const {detect,normalize}=replyGuard();
 assert.equal(detect(screenshotReply),true);
 const visible=normalize(screenshotReply,'Check Chiller progress',true);
 assert.match(visible,/not (?:executed|run)|did not (?:run|execute)/i);
 assert.match(visible,/unverified/i);
 assert.doesNotMatch(visible,/"action"\s*:/);
 assert.doesNotMatch(visible,/branch"\s*:/);
});
test('ordinary reply and source-code discussion are not mistaken for runner actions',()=>{
 const {detect,normalize}=replyGuard();
 assert.equal(detect('The Chiller repository exists; runner proof is still pending.'),false);
 assert.equal(normalize('Chiller repository exists.','Check Chiller',true),'Chiller repository exists.');
 assert.equal(detect('We should inspect the ticket with GitHub first.'),false);
});
test('context retrieval resolves its running row without counting as an engineering result',()=>{
 let state=advanceLiveBits(newLiveBitsState(),{type:'turn_started'});
 state=advanceLiveBits(state,{type:'memory',state:'retrieved'});
 assert.equal(state.entries[0].state,'observed','context check must not stay running after retrieval');
 assert.ok(state.entries.every(row=>row.contextOnly===true));
 state=advanceLiveBits(state,{type:'turn_finished',failed:false});
 assert.match(state.live,/no (?:verified )?tool (?:execution )?receipt/i);
 assert.doesNotMatch(state.live,/2 observed iterations|reply ready/i);
 assert.equal(state.candidates,0);
 assert.equal(state.credits,0);
});
test('an unexecuted job-status proposal completes as incomplete, never falsely ready',()=>{
 let state=advanceLiveBits(newLiveBitsState(),{type:'turn_started'});
 state=advanceLiveBits(state,{type:'memory',state:'retrieved'});
 state=advanceLiveBits(state,{type:'turn_finished',failed:true});
 assert.match(state.live,/incomplete|failed|unverified/i);
 assert.doesNotMatch(state.live,/Reply ready/i);
});

test('context observations never consume engineering iteration numbers',()=>{
 let s=advanceLiveBits(newLiveBitsState(),{type:'turn_started'});
 s=advanceLiveBits(s,{type:'memory',state:'retrieved'});
 const op='11111111-1111-4111-8111-111111111111';
 s=advanceLiveBits(s,{type:'tool_started',tool:'github.read_branch_status',operationId:op,
  resource:'www-infinity4/Chiller',criteriaSummary:'Check add-full-episodes'});
 const inProgress=s.entries.find(e=>e.tool==='github.read_branch_status');
 assert.equal(inProgress.ordinal,1,'first real tool action must be engineering iteration 1');
 assert.match(s.live,/^Iteration 1 · GitHub/);
 s=advanceLiveBits(s,{type:'tool_receipt',tool:'github.read_branch_status',operationId:op,
  receiptId:'branch_11111111111111111111111111111111',status:'complete'});
 const finished=s.entries.find(e=>e.tool==='github.read_branch_status');
 assert.equal(finished.ordinal,1);
 assert.equal(s.entries.filter(e=>e.contextOnly).length,2);
 assert.equal(s.entries.filter(e=>e.tool==='github.read_branch_status').length,1);
 assert.match(s.live,/^Iteration 1 · GitHub/);
 assert.equal(s.credits,0,'read-only status checks do not mint a Bubble Bit');
});
