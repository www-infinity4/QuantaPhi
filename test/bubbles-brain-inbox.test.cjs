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
 // Every entrypoint must load the same current assets; never pin a test to
 // an obsolete cache-busting version after a legitimate source deployment.
 const routes=['index.html','bubbles.html','bubbles/index.html'];
 for(const asset of ['js','css']){
  const refs=routes.map(html=>{
   const page=fs.readFileSync(html,'utf8');
   const hits=[...page.matchAll(new RegExp('bubbles-ai\\.'+asset+'\\?v=([A-Za-z0-9._-]+)','g'))];
   assert.equal(hits.length,1,html+' must include exactly one versioned Bubbles '+asset+' asset');
   return hits[0][1];
  });
  assert.equal(new Set(refs).size,1,'All entrypoints must use the same current Bubbles '+asset+' cache version');
 }
});
