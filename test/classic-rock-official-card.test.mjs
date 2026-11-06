import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CLASSIC_ROCK_BANDS, linkIsAllowed} from '../classic-rock-official-catalog.mjs';

const source=()=>readFileSync(new URL('../classic-rock-official-card.mjs',import.meta.url),'utf8');
const html=()=>readFileSync(new URL('../index.html',import.meta.url),'utf8');
const deck=()=>readFileSync(new URL('../oracle-card-deck.js',import.meta.url),'utf8');

test('five artist-driven buttons, source-backed merchandise, no reseller links',()=>{
 assert.deepEqual(CLASSIC_ROCK_BANDS.map(b=>b.id),['pink-floyd','reo-speedwagon','cheap-trick','journey','styx']);
 for(const band of CLASSIC_ROCK_BANDS){
  assert.ok(b.name && b.feature && b.youtube.startsWith('https://www.youtube.com/'));
  assert.ok(b.offers.length>=1);
  assert.ok(linkIsAllowed(b.youtube));
  for(const offer of band.offers){
   assert.ok(linkIsAllowed(offer.url),band.name+' '+offer.url);
   assert.ok(offer.label && offer.category);
   assert.doesNotMatch(offer.url,/ebay|discogs|mercari|amazon|shopify.*example|reospeedwagon\.shop/);
  }
 }
 assert.equal(linkIsAllowed('https://youtube.com.evil.test/'),'false'==='true');
 assert.equal(linkIsAllowed('javascript:alert(1)'),false);
 assert.equal(linkIsAllowed('https://reospeedwagon.shop/shop'),false);
});

test('card appears by Steve Miller, ahead of 21 plus source listings, in the original deck',()=>{
 assert.match(html(),/id="steveMillerBookOfDreamsCard"[\s\S]*?id="classicRockOfficialMusicCard"[\s\S]*?id="bruceBannerWeedmapsCard"/);
 assert.match(html(),/classic-rock-official-card\.mjs/);
 assert.match(deck(),/\['classicRockOfficialMusicCard','Classic Rock · Official music and releases'\]/);
 assert.match(deck(),/classicRockOfficialMusicCard:\['classic-rock-official-music','Music'/);
});

test('one genuine in-card YouTube player, compact play buttons, band shops and fallback',()=>{
 const js=source();
 assert.match(js,/const artistButton=node\('button'/);
 assert.match(js,/artistButton\.type='button'/);
 assert.match(js,/void playArtist\(band\)/);
 assert.match(js,/new yt\.Player/);
 assert.match(js,/videoId:band\.videoId/);
 assert.match(js,/player\.pauseVideo\(\)/);
 assert.match(js,/player\.destroy\(\)/);
 assert.match(js,/renderOffers\(band\)/);
 assert.match(js,/Watch on YouTube/);
 assert.doesNotMatch(js,/artistLink\.target = '_blank'/);
 assert.doesNotMatch(js,/MusicQuant|StarCoin|wallet\.debit/);
});
