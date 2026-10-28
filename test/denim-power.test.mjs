import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DENIM_CARDS,applyDenimPower,denimTotals,FEED_STORAGE_KEY} from '../design-lab/denim-power-core.mjs';

test('denim Power Button derives only existing valid live product card ids',()=>{
 assert.equal(DENIM_CARDS.length,6);
 assert.equal(new Set(DENIM_CARDS.map(x=>x.id)).size,6);
 assert.equal(new Set(DENIM_CARDS.map(x=>x.brand)).size,3);
 assert.ok(DENIM_CARDS.every(x=>x.url.startsWith('https://')&&x.image.startsWith('https://')));
 assert.equal(FEED_STORAGE_KEY,'quanta:discovery:anonymous:v1');
});
test('one press follows the full category idempotently while preserving unrelated follows and user history',()=>{
 const old={following:['unrelated-radio'],counts:{'unrelated-radio':4},viewed:{'unrelated-radio':2},advance:4};
 const once=applyDenimPower(old,'follow-all'),twice=applyDenimPower(once,'follow-all');
 assert.equal(denimTotals(once).followed,6);
 assert.deepEqual(twice,once);
 assert.ok(once.following.includes('unrelated-radio'));
 assert.equal(once.counts['unrelated-radio'],4);
 assert.equal(once.viewed['unrelated-radio'],2);
 assert.equal(once.advance,4);
});
test('manual filtering and remove-all touch only denim cards',()=>{
 const followed=applyDenimPower({following:['other-card']},'follow-all');
 const one=applyDenimPower(followed,'unfollow',DENIM_CARDS[0].id);
 assert.equal(denimTotals(one).followed,5);
 const back=applyDenimPower(one,'follow',DENIM_CARDS[0].id);
 assert.equal(denimTotals(back).followed,6);
 const cleared=applyDenimPower(back,'unfollow-all');
 assert.equal(denimTotals(cleared).followed,0);
 assert.deepEqual(cleared.following,['other-card']);
});
test('forged card ids, unsupported commands and overflow fail closed',()=>{
 assert.throws(()=>applyDenimPower({},'follow','not-a-real-product'),/not in the verified/);
 assert.throws(()=>applyDenimPower({},'pay-all'),/Unsupported/);
 const full={following:Array.from({length:798},(_,i)=>'other-'+i)};
 assert.throws(()=>applyDenimPower(full,'follow-all'),/safe capacity/);
});
test('Design Lab markup exposes the category controls and honest scope',()=>{
 const html=readFileSync(new URL('../design-lab/index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../design-lab/lab.css',import.meta.url),'utf8');
 assert.match(html,/id="denimFollowAll"/);
 assert.match(html,/id="denimUnfollowAll"/);
 assert.match(html,/id="denimBrandFilter"/);
 assert.match(html,/denim-power\.mjs/);
 assert.match(html,/does not follow accounts on other websites/);
 assert.match(css,/\.dp-item/);
});
