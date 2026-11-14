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
test('X public reader links to hourly browser receipts, not a misleading required developer form',()=>{
 const c=read('bubbles-x-connect.html');
 assert.match(c,/\/api\/bubbles\/public-x\/health/);
 assert.match(c,/public X posts/);
 assert.match(c,/No developer login is needed/);
 assert.match(c,/not required/);
 assert.doesNotMatch(c,/<input[^>]+(?:bearer|token|password)/i);
});
test('shared URL is composed as a canonical X intent, not an arbitrary embed',async()=>{
 const mod=await import('../quick-card-share.js');
 const u=mod.xShareLink('https://quantaphi.org/cards/real-id','Sample');
 assert.equal(new URL(u).hostname,'x.com');
 assert.equal(new URL(u).searchParams.get('url'),'https://quantaphi.org/cards/real-id');
});

test('published artwork is carried into X and Android quick-card shares',()=>{
 const page=read('published-quick-card.js');
 const helper=read('quick-card-share.js');
 const actions=read('quanta-card-actions.mjs');
 assert.match(page,/image:c\.image/);
 assert.match(page,/xShareLink\(c\.cardUrl,c\.title,c\.image/);
 assert.match(actions,/sharePreviewUrl\(card,host\)/);
 assert.match(helper,/\/q-share/);
});
test('X composer uses the actual card image metadata and returns to card',async()=>{
 const mod=await import('../quick-card-share.js');
 const intent=new URL(mod.xShareLink('https://quantaphi.org/cards/sample','Sample Jeans','https://example.org/jeans.jpg','Blue denim quick card'));
 const preview=new URL(intent.searchParams.get('url'));
 assert.equal(preview.pathname,'/q-share');
 assert.equal(preview.searchParams.get('image'),'https://example.org/jeans.jpg');
 assert.equal(preview.searchParams.get('dest'),'https://quantaphi.org/cards/sample');
});
