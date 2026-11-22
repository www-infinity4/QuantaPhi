import test from 'node:test';
import assert from 'node:assert/strict';
import {REVIEWED_OWNER_VIDEO_LINKS, REVIEWED_OWNER_VIDEO_CARDS, validateOwnerYouTubeLink} from '../youtube-owner-video-links.mjs';
import {isPublicSourceCard, validSourceCard} from '../source-quick-cards.mjs';
import {ALL_FEED_CARDS} from '../quanta-feed.mjs';
import {departmentFor} from '../quanta-context-placement.mjs';

// Owner-provided URL; video title, creator, date, embed availability and rights unverified.
test('owner UrNCWJRcra4 produces one source-only Oracle Public/Media Quick Card', () => {
  const videoId='UrNCWJRcra4';
  const matches=REVIEWED_OWNER_VIDEO_LINKS.filter(row=>row.videoId===videoId);
  assert.equal(matches.length,1,'No missing or duplicate owner source link');
  const source=matches[0];
  assert.equal(source.sourceUrl,'https://www.youtube.com/watch?v='+videoId);
  assert.equal(source.title,'YouTube video '+videoId+' (title unverified)');
  assert.equal(source.titleVerified,false);
  assert.equal(source.publisherVerified,false);
  assert.equal(source.publishedAt,null);
  assert.equal(source.observedAt,'2026-11-22');
  assert.equal(source.contentBoundary,'general-media');
  assert.ok(validateOwnerYouTubeLink(source));
  const cards=REVIEWED_OWNER_VIDEO_CARDS.filter(card=>card.reviewedYouTubeVideoId===videoId);
  assert.equal(cards.length,1,'Exactly one video Quick Card');
  const card=cards[0];
  assert.equal(card.featureUrl,source.sourceUrl);
  assert.equal(card.image,'https://i.ytimg.com/vi/'+videoId+'/hqdefault.jpg');
  assert.ok(isPublicSourceCard(card)&&validSourceCard(card));
  assert.ok(ALL_FEED_CARDS.some(row=>row.id===card.id),'Present in existing Oracle feed');
  assert.equal(departmentFor(card),'media');
  assert.match(card.details,/not independently verified/i);
});
