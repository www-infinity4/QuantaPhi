import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Steve Miller radio uses verified official Book of Dreams tracks instead of an unverified playlist',()=>{
 const s=source('steve-miller-book-of-dreams.js');
 for(const videoId of ['JHa1hiFYbFQ','HUv7pXgZ9NA','EFOjLc6vjas','cTyFNA6939w'])
  assert.ok(s.includes(videoId),videoId);
 assert.ok(s.includes('steveTracks'));
 assert.ok(s.includes('playlist='));
 assert.ok(s.includes("make('button','smb-radio-next'"));
 assert.ok(!s.includes('www.youtube.com/embed/videoseries?list='));
 assert.ok(!s.includes('window.InfinityRadioQuick.toggle()'));
});
test('artist playback is tap-initiated and uses a genuinely visible player with official fallback',()=>{
 const s=source('steve-miller-book-of-dreams.js');
 assert.ok(s.includes('min-height:210px'));
 assert.ok(s.includes('referrerPolicy'));
 assert.ok(s.includes('frame.removeAttribute'));
 assert.ok(s.includes('stevemillerband.com/releases-archive/book-dreams'));
 const classic=source('classic-rock-official-card.mjs');
 assert.ok(classic.includes('const track=tracks[trackIndex%tracks.length]'));
 assert.ok(classic.includes("frame.src='https://www.youtube.com/embed/'+track.videoId"));
 assert.ok(classic.includes('track?.videoId'));
 assert.ok(classic.includes("frame.src='https://www.youtube.com/embed/'"));
 assert.ok(!classic.includes('window.InfinityRadioQuick.toggle()'));
});
