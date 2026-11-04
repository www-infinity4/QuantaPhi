import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('artist music uses one page-level dock and no per-card iframe or outbound music links',()=>{
 const home=read('index.html'), steve=read('steve-miller-book-of-dreams.js'), rock=read('classic-rock-official-card.mjs');
 assert.match(home,/infinity-artist-music\.js/);
 assert.match(steve,/InfinityArtistMusic\.toggle/);
 assert.match(rock,/InfinityArtistMusic\.toggle/);
 assert.doesNotMatch(steve,/target\s*=\s*['_"]_blank|new yt\.Player|smb-player-frame|oracle:card-deactivated/);
 assert.doesNotMatch(rock,/artistLink\.href\s*=|artistLink\.target\s*=|window\.open\(/);
});
test('common player uses YouTube-visible, persistent, accessible controls and explicit play gesture',()=>{
 const js=read('infinity-artist-music.js');
 assert.match(js,/width:220px;height:220px/);
 assert.match(js,/position:fixed/);
 assert.match(js,/new YT\.Player/);
 assert.match(js,/aria-pressed/);
 assert.match(js,/infinity:music-focus/);
 assert.match(js,/visibilitychange/);
 assert.doesNotMatch(js,/display:none[^;]*iframe|\.mp3|\.mp4|youtube-dl|window\.open\(/);
});
test('all six artist selections are mapped to verified official video IDs',()=>{
 const js=read('infinity-artist-music.js');
 for(const id of ['D6KCZXzLdVM','K6qj09OHvjw','wJzNZ1c5C9c','T_Km11HNzUY','VcjzHMhBtf0','e5MAg_yWsq8'])
  assert.ok(js.includes(id),id+' absent');
});
test('radio yields to artist selection and artist yields to radio selection',()=>{
 const js=read('quick-infinity-radio.js');
 assert.match(js,/infinity:music-focus/);
 assert.match(js,/player:\s*'radio'/);
 assert.match(js,/audio\.pause\(\)/);
});
