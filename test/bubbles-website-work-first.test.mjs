import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('chat composer stays usable while authenticated owner pairing remains in Options',()=>{
 const ui=source('bubbles-ai.js');
 assert.match(ui,/tools\.append\(connectorCodeButton,connectorCodeOutput,connectorCodeStatus\)/);
 assert.doesNotMatch(ui,/composer\.prepend\(connectorCodeButton/);
 assert.match(ui,/tools\.append\(quick\)/);
 assert.doesNotMatch(ui,/panel\.insertBefore\(quick,chatScroll\)/);
 assert.match(ui,/quickButton\.addEventListener\('click'/);
 assert.match(ui,/chatScroll\.prepend\(browserHome\)/);
});

test('activity bubbles and per-message actions stay behind readable disclosures',()=>{
 const activity=source('bubbles-iteration-bubbles.mjs'),ui=source('bubbles-ai.js');
 assert.match(activity,/const box=create\('details','ba-iteration-bubbles'\)/);
 assert.match(activity,/const summary=create\('summary','ba-iteration-summary'/);
 assert.match(activity,/box\.append\(summary,title,buttons,details,bitPanel\)/);
 assert.match(ui,/const actionMenu=create\('details','ba-reply-actions'\)/);
 assert.match(ui,/actionMenu\.append\(actionSummary,row\)/);
});

test('Build status reflects only the current chat authenticated ticket and not other threads',()=>{
 const ui=source('bubbles-ai.js'),activity=source('bubbles-iteration-bubbles.mjs');
 assert.match(ui,/let activeIterationTicketId='';/);
 assert.match(ui,/activeIterationThreadId===activeThread/);
 assert.match(ui,/result\.tickets\.find\(ticket=>ticket\?\.id===activeIterationTicketId/);
 assert.match(ui,/activeIterationTicketId=result\.ticket\.id/);
 assert.doesNotMatch(ui,/result\.tickets\.find\(ticket=>\['blocked','queued'/);
 assert.doesNotMatch(activity,/window\.addEventListener\('quantaphi:robot-directions'/);
 assert.match(activity,/event\.status==='blocked'/);
});

test('pending GitHub result is never called completed and saved receipt is not repeated',()=>{
 const ui=source('bubbles-ai.js');
 assert.match(ui,/GitHub is processing your request\. A final result has not been verified/);
 assert.match(ui,/display\(workEvidence,'ai'\);status\.textContent='';/);
 assert.doesNotMatch(ui,/status\.textContent=workEvidence\.slice\(0,240\)/);
 assert.match(ui,/work\/tickets\/create/);
 assert.match(ui,/verifiedOwnerHeaders\(\)/);
});

test('personal context Bubble Bits display server-confirmed credits without browser wallet writes',()=>{
 const activity=source('bubbles-iteration-bubbles.mjs');
 assert.match(activity,/bitsState\.creditedBits/);
 assert.doesNotMatch(activity,/fetch\(|mint\(|walletWrites:1/);
 assert.match(activity,/contextReady/);
});

test('all Bubbles website entrypoints request the repaired scripts instead of stale cached versions',()=>{
 const revision='20261108-history-fresh1';
 for(const path of ['index.html','bubbles.html','bubbles/index.html','bubbles-chrome.html']){
  assert.match(source(path),new RegExp('/bubbles-ai\\.js\\?v='+revision));
 }
 // Both chat and activity projections request the repaired release.
 assert.match(source('bubbles-ai.js'),/\/bubbles-iteration-bubbles\.mjs\?v=20261104-iteration-credit1/);
});
