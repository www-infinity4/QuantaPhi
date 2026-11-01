import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nextCompanionPage,canAutoRotateCompanions,COMPANION_ROTATE_MS,COMPANION_REFRESH_MS} from '../shop-phi-switchboard.mjs';

test('companion offers advance through three pairs and wrap to the first pair',()=>{
 assert.equal(nextCompanionPage(0,6),1);
 assert.equal(nextCompanionPage(1,6),2);
 assert.equal(nextCompanionPage(2,6),0);
 assert.equal(nextCompanionPage(1,3),0);
 assert.equal(nextCompanionPage(0,2),0);
 assert.equal(nextCompanionPage(-1,0),0);
});

test('rotation does not disrupt viewers or sensitive cards',()=>{
 const base={count:6,visible:true,paused:false,hovering:false,focused:false,sensitive:false};
 assert.equal(canAutoRotateCompanions(base),true);
 for(const field of ['paused','hovering','focused','sensitive']){
  assert.equal(canAutoRotateCompanions({...base,[field]:true}),false,field);
 }
 assert.equal(canAutoRotateCompanions({...base,visible:false}),false);
 assert.equal(canAutoRotateCompanions({...base,count:2}),false);
});

test('moving ads have bounded pacing, refresh, and no wallet or paid-impression minting',()=>{
 assert.ok(COMPANION_ROTATE_MS>=10000);
 assert.ok(COMPANION_REFRESH_MS>=120000);
 const src=readFileSync(new URL('../shop-phi-switchboard.mjs',import.meta.url),'utf8');
 assert.match(src,/setInterval\(\(\)=>\{/);
 assert.match(src,/Pause rotation/);
 assert.match(src,/Resume rotation/);
 assert.match(src,/document\.hidden/);
 assert.match(src,/canAutoRotateCompanions/);
 assert.doesNotMatch(src,/QuantaStarCredit|wallet\.credit|mintStarCoin/);
});
