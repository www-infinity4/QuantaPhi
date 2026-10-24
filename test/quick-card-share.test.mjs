import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Quick Card builder has prominent page share and a real X setup entry',()=>{
 const page=read('quick-card-builder.html');
 assert.match(page,/id="qcpSharePage"/);
 assert.match(page,/href="\/bubbles-x-connect\.html"/);
 assert.match(read('quick-card-builder.js'),/shareQuickCard/);
 assert.match(read('quick-card-builder.js'),/qcpSharePublished/);
});
test('published cards have standalone canonical Share and X post compose controls',()=>{
 const page=read('published-quick-card.js');
 assert.match(page,/makeShareButton/);
 assert.match(page,/xShareLink/);
 assert.match(page,/c\.cardUrl/);
 assert.match(page,/mountCardActions/);
});
test('X setup never requests secrets through form or promises it is connected',()=>{
 const c=read('bubbles-x-connect.html');
 assert.match(c,/https:\/\/console\.x\.com/);
 assert.match(c,/https:\/\/dash\.cloudflare\.com/);
 assert.match(c,/X_API_BEARER_TOKEN/);
 assert.match(c,/not connected/);
 assert.doesNotMatch(c,/<input[^>]+(?:bearer|token)/i);
});
test('shared URL is composed as a canonical X intent, not an arbitrary embed',async()=>{
 const mod=await import('../quick-card-share.js');
 const u=mod.xShareLink('https://quantaphi.org/cards/real-id','Sample');
 assert.equal(new URL(u).hostname,'x.com');
 assert.equal(new URL(u).searchParams.get('url'),'https://quantaphi.org/cards/real-id');
});
