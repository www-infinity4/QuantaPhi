import test from 'node:test';
import assert from 'node:assert/strict';
import {PRIORITY_LIVE_VIDEO,PRIORITY_LIVE_VIDEO_CARD} from '../youtube-priority-live-20261121.mjs';
import {ACTIVE_SOURCE_CARDS,findSourceCard,isPublicSourceCard,validSourceCard} from '../source-quick-cards.mjs';
import {ALL_FEED_CARDS} from '../quanta-feed.mjs';
import {departmentFor} from '../quanta-context-placement.mjs';
import {readFileSync} from 'node:fs';

test('owner livestream is the first source entry with exact source and unverified channel',()=>{
 assert.equal(PRIORITY_LIVE_VIDEO.videoId,'4lLjPmSPUyg');
 assert.equal(PRIORITY_LIVE_VIDEO.sourceUrl,'https://www.youtube.com/watch?v=4lLjPmSPUyg');
 assert.equal(PRIORITY_LIVE_VIDEO.channelId,null);
 assert.equal(PRIORITY_LIVE_VIDEO.publisherVerified,false);
 assert.equal(PRIORITY_LIVE_VIDEO.fullChannelIndexed,false);
 assert.equal(ACTIVE_SOURCE_CARDS[0].id,PRIORITY_LIVE_VIDEO_CARD.id);
 assert.equal(PRIORITY_LIVE_VIDEO_CARD.priority,'front-of-line');
 assert.equal(PRIORITY_LIVE_VIDEO_CARD.reviewedYouTubeVideoId,PRIORITY_LIVE_VIDEO.videoId);
 assert.equal(PRIORITY_LIVE_VIDEO_CARD.official,PRIORITY_LIVE_VIDEO.sourceUrl);
 assert.equal(PRIORITY_LIVE_VIDEO_CARD.featureUrl,PRIORITY_LIVE_VIDEO.sourceUrl);
 assert.equal(PRIORITY_LIVE_VIDEO_CARD.contentBoundary,'general-media');
 assert.match(PRIORITY_LIVE_VIDEO_CARD.details,/not independently verified/i);
 assert.ok(isPublicSourceCard(PRIORITY_LIVE_VIDEO_CARD));
 assert.ok(validSourceCard(PRIORITY_LIVE_VIDEO_CARD));
 assert.equal(findSourceCard(PRIORITY_LIVE_VIDEO_CARD.id)?.id,PRIORITY_LIVE_VIDEO_CARD.id);
 assert.ok(ALL_FEED_CARDS.some(c=>c.id===PRIORITY_LIVE_VIDEO_CARD.id));
 assert.equal(departmentFor(PRIORITY_LIVE_VIDEO_CARD),'media');
});

test('priority stream reuses existing click-to-play single player without claiming channel feed',()=>{
 const source=readFileSync(new URL('../quanta-card-experience.mjs',import.meta.url),'utf8');
 assert.match(source,/card\.reviewedYouTubeVideoId/);
 assert.match(source,/www\.youtube-nocookie\.com\/embed\//);
 assert.match(source,/Stop playback/);
 assert.match(source,/Original video on YouTube/);
 assert.doesNotMatch(JSON.stringify(PRIORITY_LIVE_VIDEO_CARD),/autoplay=1|channelId['"]?:['"]UC/);
});
