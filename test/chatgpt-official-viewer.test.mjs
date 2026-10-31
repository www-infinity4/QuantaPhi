import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {officialView,OFFICIAL_VIEWS} from '../quanta-official-viewer.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('website identity is pinned to original chatgpt.com, without arbitrary URLs',()=>{
 assert.equal(officialView('chatgpt')?.url,'https://chatgpt.com/');
 assert.equal(officialView('https://evil.example'),null);
 assert.equal(officialView('unknown'),null);
 assert.deepEqual(Object.keys(OFFICIAL_VIEWS),['chatgpt']);
});
test('real signed-in browser path is provided, not a fake chat backend',()=>{
 const viewer=read('quanta-official-viewer.mjs');
 assert.match(viewer,/frame\.src=site\.url/);
 assert.match(viewer,/a\.target='_blank'/);
 assert.match(viewer,/Sign in at /);
 assert.match(viewer,/Open original /);
 assert.doesNotMatch(viewer,/api\.openai\.com\/v1|sessionStorage|localStorage|document\.cookie|fetch\s*\(/);
 assert.doesNotMatch(viewer,/postMessage\s*\(/);
});
test('homepage and detail route use the original ChatGPT card',()=>{
 const cards=read('source-quick-cards.mjs'),home=read('index.html'),detail=read('source-quick-card.html');
 assert.match(cards,/if\(card\.id==='chatgpt'\)mountOfficialViewer\(item,card\.id\)/);
 assert.match(cards,/if\(card\.id==='chatgpt'\)mountOfficialViewer\(host,card\.id\)/);
 assert.match(home,/quanta-official-viewer\.css/);
 assert.match(detail,/quanta-official-viewer\.css/);
 assert.match(home,/source-quick-cards\.mjs\?v=20261031-meta1/);
 assert.match(detail,/source-quick-cards\.mjs\?v=20261031-meta1/);
 const standalone=read('website-viewer.html');
 assert.match(standalone,/id="officialWebsiteViewer"/);
 assert.match(standalone,/href="\/\?card=chatgpt"/);
});
