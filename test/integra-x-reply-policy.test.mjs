import test from 'node:test';
import assert from 'node:assert/strict';
import {integraReplyDecision,isQuestion} from '../integra-x-reply-policy.mjs';
const p={id:'1234567890123456789',authorId:'123456',exists:true,visibility:'public',
 text:'Can you tell me what time the party starts?',directedAtIntegra:false};
const ready={post:p,watchedAccountIds:['123456'],optedInAccountIds:['123456'],xAiApproval:true,xApiConnected:true};
test('no approval means no automated AI reply',()=>assert.equal(integraReplyDecision({...ready,xAiApproval:false}).reason,'x_written_ai_reply_approval_required'));
test('watching without recipient opt-in never authorizes a reply',()=>assert.equal(integraReplyDecision({...ready,optedInAccountIds:[]}).allowed,false));
test('allows one explicitly invited question only after connected approval',()=>{
 assert.equal(integraReplyDecision(ready).allowed,true);
 assert.equal(integraReplyDecision({...ready,answeredPostIds:[p.id]}).reason,'already_answered');
 assert.equal(integraReplyDecision({...ready,optedOutAccountIds:[p.authorId]}).reason,'opted_out');
});
test('replies must address a real public question',()=>{
 assert.equal(integraReplyDecision({...ready,post:{...p,text:'Morning coffee.'}}).reason,'not_a_question');
 assert.equal(integraReplyDecision({...ready,post:{...p,visibility:'private'}}).allowed,false);
 assert.equal(isQuestion('What is this?'),true);
});