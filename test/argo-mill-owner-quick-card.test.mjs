import test from 'node:test';
import assert from 'node:assert/strict';
import {REVIEWED_OWNER_VIDEO_LINKS,REVIEWED_OWNER_VIDEO_CARDS,validateOwnerYouTubeLink} from '../youtube-owner-video-links.mjs';
import {ACTIVE_SOURCE_CARDS,isPublicSourceCard,validSourceCard} from '../source-quick-cards.mjs';
import {ALL_FEED_CARDS} from '../quanta-feed.mjs';
import {departmentFor} from '../quanta-context-placement.mjs';

test('owner-provided Argo Mill YouTube Short is a source-backed Oracle media Quick Card',()=>{
 const source=REVIEWED_OWNER_VIDEO_LINKS.find(v=>v.videoId==='bzvtKRteavs');
 assert.ok(source,'The provided Argo Mill video must be indexed');
 assert.equal(source.sourceUrl,'https://www.youtube.com/watch?v=bzvtKRteavs');
 assert.equal(source.title,'#idahosprings #goldmill #goldmine $goldmining #gold');
 assert.equal(source.observedAt,'2026-11-21');
 assert.equal(source.publishedAt,null);
 assert.equal(source.publisherVerified,false,'A video URL alone cannot verify an account or channel');
 assert.equal(source.contentBoundary,'general-media');
 assert.equal(source.shortsRoute,true);
 assert.ok(validateOwnerYouTubeLink(source));
 assert.equal(validateOwnerYouTubeLink({...source,sourceUrl:'https://youtube.com.evil.test/watch?v=bzvtKRteavs'}),false);
 const card=REVIEWED_OWNER_VIDEO_CARDS.find(c=>c.reviewedYouTubeVideoId===source.videoId);
 assert.ok(card);
 assert.equal(card.image,'https://i.ytimg.com/vi/bzvtKRteavs/hqdefault.jpg');
 assert.equal(card.secondUrl,'https://www.youtube.com/shorts/bzvtKRteavs');
 assert.equal(card.secondLabel,'Open Shorts link');
 assert.match(card.details,/not a complete channel archive/i);
 assert.ok(isPublicSourceCard(card));
 assert.ok(validSourceCard(card));
 assert.ok(ACTIVE_SOURCE_CARDS.some(c=>c.id===card.id));
 assert.ok(ALL_FEED_CARDS.some(c=>c.id===card.id));
 assert.equal(departmentFor(card),'media');
});

test('Shorts route cannot be spoofed or attached to unrelated videos',()=>{
 const source=REVIEWED_OWNER_VIDEO_LINKS.find(v=>v.videoId==='bzvtKRteavs');
 assert.equal(validateOwnerYouTubeLink({...source,shortsRoute:'https://example.com'}),false);
 assert.ok(REVIEWED_OWNER_VIDEO_CARDS.every(card=>card.reviewedYouTubeVideoId==='bzvtKRteavs'||!card.secondUrl||card.secondUrl!=='https://www.youtube.com/shorts/bzvtKRteavs'));
});
