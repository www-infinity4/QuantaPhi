import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('chat keeps connection and pairing controls in existing Notes and work, not over the conversation',()=>{
 const ui=source('bubbles-ai.js');
 assert.match(ui,/tools\.append\(connectorCodeButton,connectorCodeOutput,connectorCodeStatus\)/);
 assert.doesNotMatch(ui,/composer\.prepend\(connectorCodeButton/);
 assert.match(ui,/tools\.append\(quick\)/);
 assert.doesNotMatch(ui,/panel\.insertBefore\(quick,chatScroll\)/);
 assert.match(ui,/chatScroll\.prepend\(browserHome\)/, 'browser still belongs inside transcript scroll');
 assert.match(ui,/quickButton\.addEventListener\('click'/, 'real owner grant remains available');
});

test('activity diagnostics and message actions are progressive disclosures rather than seven default buttons',()=>{
 const ui=source('bubbles-ai.js'),activity=source('bubbles-iteration-bubbles.mjs');
 assert.match(activity,/const box=create\('details','ba-iteration-bubbles'\)/);
 assert.match(activity,/const summary=create\('summary','ba-iteration-summary'/);
 assert.match(activity,/box\.append\(summary,title,buttons,details,bitPanel\)/);
 assert.match(ui,/const actionMenu=create\('details','ba-reply-actions'\)/);
 assert.match(ui,/actionMenu\.append\(actionSummary,row\)/);
});

test('only the current owner-authenticated job may update Build status in this chat',()=>{
 const ui=source('bubbles-ai.js'),activity=source('bubbles-iteration-bubbles.mjs');
 assert.match(ui,/let activeIterationTicketId='';/);
 assert.match(ui,/result\.tickets\.find\(ticket=>ticket\?\.id===activeIterationTicketId/);
 assert.doesNotMatch(ui,/result\.tickets\.find\(ticket=>\['blocked','queued'/);
 assert.match(ui,/activeIterationTicketId=result\.ticket\.id/);
 assert.doesNotMatch(activity,/window\.addEventListener\('quantaphi:robot-directions'/);
 assert.match(activity,/event\.status==='blocked'/, 'real blocks remain displayed when scoped');
});

test('work reply appears once and processing acknowledgement is not presented as completion',()=>{
 const ui=source('bubbles-ai.js');
 assert.match(ui,/GitHub is processing your request\. A final result has not been verified/);
 assert.match(ui,/display\(workEvidence,'ai'\);status\.textContent='';/);
 assert.doesNotMatch(ui,/status\.textContent=workEvidence\.slice\(0,240\)/);
});

test('all chat repairs preserve wallet and existing owner verification boundary',()=>{
 const ui=source('bubbles-ai.js');
 assert.match(ui,/verifiedOwnerHeaders\(\)/);
 assert.match(ui,/work\/tickets\/create/);
 assert.match(ui,/start_immediately:true/);
 assert.match(ui,/requestRunner\(/);
});
