import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const load=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('the actual top QuantaPhi search uses an opt-in suggestion assistant',()=>{
 const page=load('index.html');
 assert.match(page,/<input id="q" type="search"/);
 assert.match(page,/src="\/quanta-home-search-assist\.mjs\?v=/);
 assert.match(page,/href="\/quanta-home-search-assist\.css\?v=/);
 const js=load('quanta-home-search-assist.mjs');
 assert.match(js,/getElementById\('q'\)/);
 assert.match(js,/suggestFeedSearch\(/);
 assert.match(js,/aria-expanded/);
 assert.match(js,/keydown/);
 assert.match(js,/event\.key!=='Escape'/);
 assert.match(js,/suggestion\.sourceUrl/);
 assert.match(js,/search\.value=suggestion\.label/);
 assert.doesNotMatch(js,/\.submit\(|\.requestSubmit\(|\.click\(\)/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|document\.cookie|fetch\(/);
});
test('the original Search button still owns submission and choices are finger-friendly',()=>{
 const js=load('quanta-home-search-assist.mjs');
 const css=load('quanta-home-search-assist.css');
 assert.match(js,/type='button'/);
 assert.match(js,/target='_blank'/);
 assert.match(js,/rel='noopener noreferrer'/);
 assert.match(css,/min-height:4[4-9]px/);
 assert.match(css,/focus-visible/);
 assert.match(css,/max-width:420px/);
});

test('public homepage suggestions also include published original-site Quick Cards',async()=>{
 const {TINYFISH_CARDS}=await import('../tinyfish-card-catalog.mjs');
 const {suggestFeedSearch}=await import('../quanta-feed-search-assist.mjs');
 const sourceBacked=suggestFeedSearch(Object.values(TINYFISH_CARDS),'burger king');
 assert.equal(sourceBacked.find(card=>card.id==='burger-king')?.sourceUrl,'https://www.bk.com/');
 const ui=load('quanta-home-search-assist.mjs');
 assert.match(ui,/Object\.values\(TINYFISH_CARDS\)/);
 assert.match(ui,/suggestFeedSearch\(HOME_SEARCH_CARDS,search\.value/);
});
