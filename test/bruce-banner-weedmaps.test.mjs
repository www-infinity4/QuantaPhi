import test from 'node:test';
import assert from 'node:assert/strict';
import {BRUCE_BANNER_SOURCES,eligibleBannerSource,chooseBannerSource} from '../bruce-banner-weedmaps.mjs';

test('real Weedmaps ILLICIT Bruce Banner publisher formats are linked individually',()=>{
 assert.ok(BRUCE_BANNER_SOURCES.length>=7);
 const ids=new Set();
 for(const entry of BRUCE_BANNER_SOURCES){
  assert.ok(entry.id && !ids.has(entry.id));ids.add(entry.id);
  assert.equal(entry.kind,'independent-source');
  assert.equal(entry.official_domain,'weedmaps.com');
  assert.equal(new URL(entry.url).protocol,'https:');
  assert.equal(new URL(entry.url).hostname,'weedmaps.com');
  assert.equal('price' in entry,false);
  assert.equal('image' in entry,false);
  assert.equal('paid' in entry,false);
  assert.equal('available' in entry,false);
  assert.equal(eligibleBannerSource(entry,false),null);
  assert.equal(eligibleBannerSource(entry,true)?.id,entry.id);
 }
 const labels=BRUCE_BANNER_SOURCES.map(x=>x.format);
 for(const category of ['Strain reference','Flower','Rosin','Live resin','Live sugar','Live badder'])assert.ok(labels.includes(category),category);
});
test('reject malformed and redirecting untrusted source urls',()=>{
 const source=BRUCE_BANNER_SOURCES[0];
 for(const bad of [
  {...source,url:'http://weedmaps.com/strains/bruce-banner'},
  {...source,url:'https://weedmaps.com.evil.example/products'},
  {...source,url:'https://evil.example/brands/illicit'},
  {...source,url:'javascript:alert(1)'},
  {...source,kind:'paid-ad'},
  {...source,title:''}
 ])assert.equal(eligibleBannerSource(bad,true),null);
});
test('rotation prioritizes unseen listings and never repeats a previous item immediately',()=>{
 const items=BRUCE_BANNER_SOURCES.slice(0,3),[a,b,c]=items;
 assert.equal(chooseBannerSource(items,'',[])?.id,a.id);
 assert.equal(chooseBannerSource(items,a.id,[a.id])?.id,b.id);
 assert.equal(chooseBannerSource(items,b.id,[a.id,b.id])?.id,c.id);
 assert.equal(chooseBannerSource(items,c.id,[a.id,b.id,c.id])?.id,a.id);
 assert.equal(chooseBannerSource([],a.id,[]),null);
});
test('Bruce Banner has a real home page Quick Card, Android-safe layout and Oracle carousel entry',async()=>{
 const fs=await import('node:fs/promises');
 const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
 const deck=await fs.readFile(new URL('../oracle-card-deck.js',import.meta.url),'utf8');
 const client=await fs.readFile(new URL('../bruce-banner-card.mjs',import.meta.url),'utf8');
 const style=await fs.readFile(new URL('../bruce-banner-card.css',import.meta.url),'utf8');
 assert.match(html,/id="bruceBannerWeedmapsCard"/);
 assert.match(html,/bruce-banner-card\.mjs/);
 assert.match(html,/bruce-banner-card\.css/);
 assert.match(deck,/\['bruceBannerWeedmapsCard',/);
 assert.match(client,/eligibleBannerSource/);
 assert.match(client,/acknowledged=true/);
 assert.match(client,/Next Weedmaps listing/);
 assert.match(client,/prefers-reduced-motion/);
 assert.match(style,/max-width:480px/);
});

test('privacy opt-out blocks Oracle view/open persistence and personalized ranking',async()=>{
 const fs=await import('node:fs/promises');
 const deck=await fs.readFile(new URL('../oracle-card-deck.js',import.meta.url),'utf8');
 const card=await fs.readFile(new URL('../bruce-banner-card.mjs',import.meta.url),'utf8');
 const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/id="bruceBannerWeedmapsCard" data-personalization="disabled"/);
 assert.match(card,/root\.dataset\.personalization='disabled'/);
 assert.match(deck,/function nonProfiling\(entry\)/);
 assert.match(deck,/if\(!nonProfiling\(entry\)\)void import\('\/bubbles-project-discovery/);
 assert.match(deck,/if\(!nonProfiling\(entry\)\)\{\s*entry\.count=/);
 assert.match(deck,/if\(!active\|\|nonProfiling\(active\)\|\|/);
 assert.match(deck,/selectedTab!=='for-you'\|\|!nonProfiling\(e\)/);
});
test('Bruce Banner card remains in one Oracle stage and respects mobile, keyboard and viewport',async()=>{
 const fs=await import('node:fs/promises');
 const card=await fs.readFile(new URL('../bruce-banner-card.mjs',import.meta.url),'utf8');
 const css=await fs.readFile(new URL('../bruce-banner-card.css',import.meta.url),'utf8');
 assert.match(css,/oracle-card-deck-active:not\(\.oracle-shelf-open\) main\.app>#bruceBannerWeedmapsCard\{display:none!important\}/);
 assert.match(css,/\.bb-action\{flex:0 0 auto;min-height:44px\}/);
 assert.match(card,/close\.addEventListener\('click',\(\)=>\{stop\(\);gate\.focus\(\)\}\)/);
 assert.match(card,/root\.getBoundingClientRect\(\)/);
 assert.match(card,/bounds\.bottom>0&&bounds\.top</);
 assert.doesNotMatch(card,/root\.getClientRects\(\)\.length===0/);
});
