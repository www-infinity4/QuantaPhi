import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CLASSIC_ROCK_BANDS} from '../classic-rock-official-catalog.mjs';

const steve=()=>readFileSync(new URL('../steve-miller-book-of-dreams.js',import.meta.url),'utf8');
const rock=()=>readFileSync(new URL('../classic-rock-official-card.mjs',import.meta.url),'utf8');

test('Steve Miller renders genuine YouTube poster and permits manual play outside carousel',()=>{
 const src=steve();
 assert.match(src,/i\.ytimg\.com\/vi\//);
 assert.match(src,/function canPlayHere\(\)/);
 assert.match(src,/if \(!canPlayHere\(\)\) return;/);
 assert.match(src,/if \(root\.closest\('#oracleCardStage'\)\) autoplayIfActive\(\)/);
});

test('five classic rock selections have official specific YouTube videos, not just channel landing links',()=>{
 assert.equal(CLASSIC_ROCK_BANDS.length,5);
 for(const band of CLASSIC_ROCK_BANDS){
  assert.match(band.videoId,/^[A-Za-z0-9_-]{11}$/,'verified YouTube ID for '+band.name);
  assert.ok(band.videoTitle && band.videoTitle.length>3,band.name);
 }
});

test('classic rock installs a real in-card YouTube player with controls and pause on exit',()=>{
 const src=rock();
 assert.match(src,/new yt\.Player/);
 assert.match(src,/controls:\s*1/);
 assert.match(src,/oracle:card-deactivated/);
 assert.match(src,/player\.pauseVideo\(\)/);
 assert.match(src,/player\.destroy\(\)/);
 assert.doesNotMatch(src,/artistLink\.target = '_blank'/);
});

test('all music cards have direct, labeled YouTube fallback links, not a mock player',()=>{
 assert.match(steve(),/Open full album on YouTube/);
 assert.match(rock(),/Watch on YouTube/);
 assert.doesNotMatch(rock(),/No embedded viewer/);
});
