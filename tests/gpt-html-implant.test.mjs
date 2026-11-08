import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizePrice,publicWebsite,creatorProfile,validateHtmlImport,isolatedPreviewDocument,publisherDraftUrl} from '../gpt-html-implant-core.mjs';
import {PI_SINGER_QUICK_CARD,lookupQuickCard,searchQuickCards} from '../quick-card-search-core.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('free choice and custom StarCoin price are exact whole integer strings',()=>{
 assert.deepEqual(normalizePrice('free','999'),{mode:'free',starCoins:'0'});
 assert.deepEqual(normalizePrice('paid','1'),{mode:'paid',starCoins:'1'});
 assert.deepEqual(normalizePrice('paid','25000000000000000000'),{mode:'paid',starCoins:'25000000000000000000'});
 for(const bad of ['0','-1','1.2','1e4','NaN','', '01'])assert.ok(normalizePrice('paid',bad).error,bad);
});
test('safe published URLs reject local and credential endpoints',()=>{
 assert.equal(publicWebsite('https://example.org/pi-singer.html#foo'),'https://example.org/pi-singer.html');
 for(const bad of ['http://example.org','https://localhost/foo','https://127.0.0.1/','https://a:b@example.com/x'])assert.equal(publicWebsite(bad),'');
 assert.equal(creatorProfile('https://x.com/PiComposer'),'https://x.com/PiComposer');
 assert.equal(creatorProfile('https://x.com/i/spaces/someid'),'');
});
test('untrusted HTML preview places CSP ahead of markup and limits payload',()=>{
 const input='<html><body><canvas id="play"></canvas><script>document.body.dataset.ok="yes"</script></body></html>';
 const preview=isolatedPreviewDocument(input);
 assert.ok(!preview.error);
 assert.ok(preview.html.indexOf('Content-Security-Policy')<preview.html.indexOf('document.body.dataset'));
 assert.match(preview.html,/connect-src 'none'/);
 assert.match(preview.html,/frame-src 'none'/);
 assert.ok(validateHtmlImport('https://example.org').error);
 assert.ok(validateHtmlImport('<div>'+ 'x'.repeat(160000) +'</div>').error);
});
test('publisher handoff passes only metadata and pricing, never untrusted HTML',()=>{
 const draft=publisherDraftUrl({title:'Pi Singer',website:'https://example.org/pi-singer.html',mode:'paid',starCoins:'42',profile:'https://x.com/PiComposer'});
 assert.ok(!draft.error);
 const u=new URL(draft.url,'https://quantaphi.org');
 assert.equal(u.pathname,'/quick-card-builder.html');
 assert.equal(u.searchParams.get('monetization'),'paid');
 assert.equal(u.searchParams.get('priceStarCoins'),'42');
 assert.equal(u.searchParams.get('creatorProfile'),'https://x.com/PiComposer');
 assert.ok(!u.search.includes('<script'));
});
test('GPT-created HTML stays in sandbox; no third-party script or login in privileged origin',()=>{
 const html=read('gpt-html-implant.html'),js=read('gpt-html-implant.mjs');
 assert.match(html,/sandbox="allow-scripts"/);
 assert.doesNotMatch(html,/allow-same-origin|allow-top-navigation|allow-forms/);
 assert.match(html,/Pi Singer example/);
 assert.match(js,/frame\.srcdoc=result\.html/);
 assert.doesNotMatch(js,/\\bfetch\\s*\\(/);
});

test('Pi Singer is an actual hosted first-party app with artwork and search result',()=>{
 assert.equal(lookupQuickCard('pi-singer'),PI_SINGER_QUICK_CARD);
 assert.equal(searchQuickCards('Pi Singer')[0]?.id,'pi-singer');
 assert.match(read('apps/pi-singer.html'),/<canvas id="screen"/);
 assert.match(read('apps/pi-singer.html'),/Pi Singer/);
 assert.match(read('quick-card-search.mjs'),/image.alt=card.name/);
});
