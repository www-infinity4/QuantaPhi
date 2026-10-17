'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const js=fs.readFileSync('bubbles-ai.js','utf8');
const css=fs.readFileSync('bubbles-ai.css','utf8');
test('One authenticated Brain inbox is in the same website/Android conversation',()=>{
 assert.match(js,/const brainInbox=!embedded\?create\('details','ba-brain-inbox'\):null/);
 assert.match(js,/chatScroll\.insertBefore\(brainInbox,conversation\)/);
 assert.match(js,/Robot Brain notifications/);
 assert.match(js,/function renderBrainInbox\(/);
 assert.match(js,/function recordBrainNotice\(/);
 assert.match(js,/brainInboxState\.dataset\.connection=state/);
 assert.match(js,/brainConnectionState\('Brain unreachable · latest notices retained', 'unreachable'\)/);
 assert.match(js,/recordBrainNotice\(text\);\s*display\(text,'ai'\)/);
 assert.match(js,/if\(!brainInboxInitialized\)/);
 assert.match(js,/Working is a label; a commit, test and deployment receipt are separate proof/);
 assert.match(css,/\.ba-brain-inbox/);
 for(const html of ['index.html','bubbles.html','bubbles/index.html']){
  const page=fs.readFileSync(html,'utf8');
  assert.match(page,/bubbles-ai\.js\?v=20261016-inbox32/);
  assert.match(page,/bubbles-ai\.css\?v=20261016-inbox32/);
 }
});
