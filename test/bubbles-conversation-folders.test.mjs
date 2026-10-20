import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {githubReply,workReply,progressReply,workSummary} from '../bubbles-human-replies.mjs';
test('Bubbles uses normal conversation and never exposes internal ticket or GitHub identifiers',()=>{
 assert.match(githubReply({ok:true,status:'dispatch_accepted',requestId:'123456789'}),/not finished/i);
 assert.doesNotMatch(githubReply({ok:true,status:'dispatch_accepted',requestId:'123456789'}),/123456789/);
 assert.match(workReply({runner:'queued_for_runner',status:'ready'}),/not started/i);
 assert.match(workReply({runner:'awaiting_repository_runner',status:'working'}),/cannot confirm/i);
 assert.match(workReply({runner:'completed_verified',status:'deployed_verified'}),/finished/i);
 assert.match(progressReply('Job blocked because no runner'),/needs attention/i);
 assert.match(progressReply('Ticket queued for runner'),/waiting/i);
 assert.match(workSummary([{status:'working'},{status:'blocked'}]),/work overview/i);
 assert.doesNotMatch(githubReply({status:'working',requestId:'gh-555'}),/555/);
});
test('Bubbles keeps the existing full-screen Android view and exposes foldered conversations',()=>{
 const js=readFileSync('bubbles-ai.js','utf8'),css=readFileSync('bubbles-unified.css','utf8');
 assert.match(js,/activeThread/);
 assert.match(js,/sessions-list/);
 assert.match(js,/sessions-get/);
 assert.match(js,/New chat/);
 assert.match(js,/chatScroll\.insertBefore\(chatsPanel,conversation\)/);
 assert.match(css,/ba-conversation-folders/);
 assert.match(js,/tools\.append\(repositoryPicker\)/);
 assert.match(js,/tools\.append\(brainInbox\)/);
 assert.match(js,/humanReplies\(\)/);
 assert.doesNotMatch(js,/localStorage\.removeItem\(HISTORY\).*View cleared/);
});
