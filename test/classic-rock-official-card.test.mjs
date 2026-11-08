import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CLASSIC_ROCK_BANDS,linkIsAllowed} from '../classic-rock-official-catalog.mjs';
const source=()=>readFileSync(new URL('../classic-rock-official-card.mjs',import.meta.url),'utf8');
const html=()=>readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('all five artist selectors retain official release and video metadata',()=>{
 assert.deepEqual(CLASSIC_ROCK_BANDS.map(b=>b.id),['pink-floyd','reo-speedwagon','cheap-trick','journey','styx']);
 for(const band of CLASSIC_ROCK_BANDS){
  assert.ok(band.name&&band.offers.length>0&&/^[A-Za-z0-9_-]{11}$/.test(band.videoId));
  for(const offer of band.offers)assert.equal(linkIsAllowed(offer.url),true,offer.url);
 }
 assert.equal(linkIsAllowed('javascript:alert(1)'),false);
});
test('classic rock retains the same Quick Card and has a genuine visible artist source',()=>{
 const s=source();
 assert.ok(html().includes('id="classicRockOfficialMusicCard"'));
 assert.ok(s.includes("const frame=node('iframe'"));
 assert.ok(s.includes('frame.src='));
 assert.ok(s.includes('const track=tracks[trackIndex%tracks.length]'));
 assert.ok(s.includes("frame.src='https://www.youtube.com/embed/'+track.videoId"));
 assert.ok(s.includes('track?.videoId'));
 assert.ok(s.includes('renderOffers(band);start(band)'));
 assert.ok(s.includes('min-height:210px'));
 assert.ok(s.includes('referrerPolicy'));
 assert.ok(s.includes('aria-pressed'));
});
test('artist selections cannot start unrelated Infinity Radio or touch wallet',()=>{
 const s=source();
 assert.ok(!s.includes('window.InfinityRadioQuick.toggle()'));
 assert.ok(!s.includes('wallet.debit'));
 assert.ok(s.includes('quantaphi:artist-radio-start'));
});
