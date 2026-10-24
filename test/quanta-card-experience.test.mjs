import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validMediaUrl,loadVerifiedTrends} from '../quanta-card-experience.mjs';
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
 assert.match(feed,/card\.origin==='source'/);
 assert.match(feed,/qf-inline-tool/);
 assert.match(providers,/iqc-inline-tools/);
 assert.match(providers,/quantaphi:source-cards-ready/);
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
 assert.match(p,/mountCardTools/);
 assert.doesNotMatch(p,/Open quick card in Infinity Viewer/);
 assert.match(p,/Official site/);
 assert.match(read('quanta-feed-card.html'),/quanta-card-experience\.css/);
});

test('existing Google Trends RSS data is validated, attributed and falls back to the maintained snapshot',async()=>{
 const valid={source:'Google Trends Trending Now RSS',region:'US',checked_at:'2026-10-24T04:00:00Z',source_url:'https://trends.google.com/trending/rss?geo=US',topics:[{query:'vacuum tube radio',approx_searches:'20K+',published_at:'2026-10-24T02:00:00Z'},{query:'fake traffic',approx_searches:'not measured',published_at:'2026-10-24T02:00:00Z'}]};
 const urls=[];
 const result=await loadVerifiedTrends(async url=>{urls.push(url);return {ok:true,json:async()=>valid}});
 assert.equal(result.items.length,1);
 assert.equal(result.items[0].query,'vacuum tube radio');
 assert.match(result.sourceUrl,/trends\.google\.com/);
 assert.equal(urls.length,1);
 let calls=0;
 const fallback=await loadVerifiedTrends(async()=>{
  calls++;return {ok:calls!==1,json:async()=>valid};
 });
 assert.equal(fallback.items.length,1);
 assert.equal(calls,2);
 await assert.rejects(loadVerifiedTrends(async()=>({ok:true,json:async()=>({source:'invented',region:'US',topics:[]})})),/verified_trends_unavailable/);
});

test('Google and Bing are native search forms on the current tile, before trend extras',()=>{
 const src=read('quanta-card-experience.mjs'),home=read('source-quick-cards.mjs');
 assert.match(src,/form\.method='GET'/);
 assert.match(src,/form\.action=spec\[0\]\.split\('\?'\)\[0\]/);
 assert.match(src,/field\.name='q'/);
 assert.match(src,/field\.required=true/);
 assert.ok(src.indexOf('searchTool(root,card);')<src.indexOf('trendingTool(root,card);'));
 assert.doesNotMatch(home,/Open quick card in Infinity Viewer/);
 assert.match(home,/mountCardTools\(tools,card\)/);
 assert.match(src,/qcx-site-icon/);
});
