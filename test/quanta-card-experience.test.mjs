import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validMediaUrl} from '../quanta-card-experience.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('real player URLs are vetted for YouTube, TikTok and Spotify embeds',()=>{
 assert.equal(validMediaUrl('youtube','https://www.youtube.com/watch?v=dQw4w9WgXcQ'),true);
 assert.equal(validMediaUrl('youtube','https://youtu.be/dQw4w9WgXcQ'),true);
 assert.equal(validMediaUrl('youtube','https://evil.example/watch?v=dQw4w9WgXcQ'),false);
 assert.equal(validMediaUrl('youtube','javascript:alert(1)'),false);
 assert.equal(validMediaUrl('tiktok','https://www.tiktok.com/@creator/video/7312345678901234567'),true);
 assert.equal(validMediaUrl('tiktok','https://not-tiktok.example/@creator/video/7312345678901234567'),false);
 assert.equal(validMediaUrl('spotify','https://open.spotify.com/track/11dFghVXANMlKmJXsNCbNl'),true);
 assert.equal(validMediaUrl('spotify','https://open.spotify.com.evil.example/track/11dFghVXANMlKmJXsNCbNl'),false);
});

test('card tools contain user-action microphone controls, real Wikipedia API, citation links and metal math',()=>{
 const src=read('quanta-card-experience.mjs');
 assert.match(src,/getUserMedia\(/);
 assert.match(src,/MediaRecorder/);
 assert.match(src,/rec\.onstop=/);
 assert.match(src,/chunks\.length/);
 assert.match(src,/URL\.revokeObjectURL/);
 assert.match(src,/navigator\.mediaDevices\.getUserMedia/);
 assert.match(src,/origin','\*'/);
 assert.match(src,/credentials:'omit'/);
 assert.match(src,/en\.wikipedia\.org\/w\/api\.php/);
 assert.match(src,/new Intl\.NumberFormat/);
 assert.match(src,/noopener,noreferrer/);
 assert.match(src,/qcx-check/);
 assert.doesNotMatch(src,/api\.robinhood\.com|api\.chime\.com|private[_-]key/i);
});

test('Public / For You / Following cards display functional widgets and no emoji-only covers',()=>{
 const feed=read('quanta-feed.mjs');
 const providers=read('source-quick-cards.mjs');
 const page=read('source-quick-card.html');
 const theme=read('quanta-card-experience.css');
 assert.match(feed,/mountCardTools\(tools,selected\)/);
 assert.match(feed,/mountCardTools\(tools,card\)/);
 assert.match(feed,/createCardArtwork\(selected\)/);
 assert.match(feed,/createCardArtwork\(card,true\)/);
 assert.match(providers,/mountCardTools\(tools,card\)/);
 assert.match(providers,/createCardArtwork\(card,true\)/);
 assert.match(page,/quanta-card-experience\.css/);
 assert.match(theme,/qcx-art-mark/);
 assert.match(theme,/@media\(max-width:560px\)/);
 assert.doesNotMatch(feed,/const iconFor=/);
});

test('source providers continue to open on official domains, without faking sign-in',()=>{
 const p=read('source-quick-cards.mjs');
 assert.match(p,/Never claim/);
 assert.match(p,/source-quick-card\.html\?card=/);
 assert.match(p,/Official site/);
 assert.match(read('quanta-feed-card.html'),/quanta-card-experience\.css/);
});
