import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CLASSIC_ROCK_BANDS,linkIsAllowed} from '../classic-rock-official-catalog.mjs';
const source=()=>readFileSync(new URL('../classic-rock-official-card.mjs',import.meta.url),'utf8');
const html=()=>readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('all five artist selectors retain separately verified official release sources',()=>{
 assert.deepEqual(CLASSIC_ROCK_BANDS.map(b=>b.id),['pink-floyd','reo-speedwagon','cheap-trick','journey','styx']);
 for(const band of CLASSIC_ROCK_BANDS){
  assert.ok(b.name&&band.offers.length>0);
  for(const offer of band.offers)assert.equal(linkIsAllowed(offer.url),true,offer.url);
 }
 assert.equal(linkIsAllowed('javascript:alert(1)'),false);
});
test('real Infinity Radio control and artist spotlight stay in the original card',()=>{
 const s=source();
 assert.match(html(),/id="classicRockOfficialMusicCard"/);
 assert.match(s,/window\.InfinityRadioQuick\.toggle\(\)/);
 assert.match(s,/quantaphi:infinity-radio-state/);
 assert.match(s,/width:48px;height:48px/);
 assert.match(s,/renderOffers\(band\)/);
 assert.match(s,/aria-pressed/);
});
test('artist selectors are not fake independent streaming audio players',()=>{
 const s=source();
 assert.doesNotMatch(s,/new yt\.Player|iframe_api|crOfficialYouTubeMount|oracle:card-deactivated/);
 assert.doesNotMatch(s,/MusicQuant|StarCoin|wallet\.debit/);
});
