import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CLASSIC_ROCK_BANDS,linkIsAllowed} from '../classic-rock-official-catalog.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('five verified artist channels and original band-controlled releases, never reseller links',()=>{
 assert.deepEqual(CLASSIC_ROCK_BANDS.map(b=>b.id),['pink-floyd','reo-speedwagon','cheap-trick','journey','styx']);
 for(const band of CLASSIC_ROCK_BANDS){
  assert.ok(b.name&&band.feature&&band.youtube.startsWith('https://www.youtube.com/'));
  assert.ok(b.offers.length>=1);
  assert.ok(linkIsAllowed(band.youtube));
  for(const offer of band.offers){
   assert.ok(linkIsAllowed(offer.url),band.name+' '+offer.url);
   assert.ok(offer.label&&offer.category);
   assert.doesNotMatch(offer.url,/ebay|discogs|mercari|amazon|shopify.*example|reospeedwagon\.shop/);
  }
 }
 assert.equal(linkIsAllowed('https://youtube.com.evil.test/'),false);
 assert.equal(linkIsAllowed('javascript:alert(1)'),false);
});
test('card stays next to Steve Miller and includes the same shared player controls',()=>{
 const html=read('index.html'),deck=read('oracle-card-deck.js'),js=read('classic-rock-official-card.mjs');
 assert.match(html,/id="steveMillerBookOfDreamsCard"[\s\S]*?id="classicRockOfficialMusicCard"[\s\S]*?id="bruceBannerWeedmapsCard"/);
 assert.match(html,/classic-rock-official-card\.mjs/);
 assert.match(deck,/\['classicRockOfficialMusicCard','Classic Rock · Official music and releases'\]/);
 assert.match(js,/node\('button','cr-artist'\)/);
 assert.match(js,/InfinityArtistMusic\?\.toggle\(band\.id\)/);
 assert.match(js,/aria-pressed/);
 assert.match(js,/renderOffers\(band\)/);
 assert.doesNotMatch(js,/artistLink\.href|artistLink\.target|window\.open|YT\.Player|audio\.play|<iframe/);
 assert.doesNotMatch(js,/MusicQuant|StarCoin|wallet\.debit/);
});
