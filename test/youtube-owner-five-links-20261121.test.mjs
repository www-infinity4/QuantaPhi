import test from 'node:test';
import assert from 'node:assert/strict';
import {REVIEWED_OWNER_VIDEO_LINKS, REVIEWED_OWNER_VIDEO_CARDS, validateOwnerYouTubeLink} from '../youtube-owner-video-links.mjs';
import {findSourceCard, isPublicSourceCard, validSourceCard} from '../source-quick-cards.mjs';
import {ALL_FEED_CARDS} from '../quanta-feed.mjs';
import {departmentFor} from '../quanta-context-placement.mjs';

const ids=['93YR_yN2dSY','cfGcMiv3pkw','21tiB8QgHoM','BM41NL-KoDc','kd1PLywtQzI'];

test('five new owner YouTube links are retained exactly once with unverified metadata',()=>{
  for(const id of ids){
    const matches=REVIEWED_OWNER_VIDEO_LINKS.filter(v=>v.videoId===id);
    assert.equal(matches.length,1,id);
    const video=matches[0];
    assert.equal(video.sourceUrl,'https://www.youtube.com/watch?v='+id);
    assert.equal(video.observedAt,'2026-11-21');
    assert.equal(video.titleVerified,false);
    assert.equal(video.publisherVerified,false);
    assert.equal(video.publishedAt,null);
    assert.equal(video.contentBoundary,'general-media');
    assert.ok(validateOwnerYouTubeLink(video),id);
    assert.match(video.title,/^YouTube video /);
    const card=REVIEWED_OWNER_VIDEO_CARDS.find(c=>c.reviewedYouTubeVideoId===id);
    assert.ok(card,id);
    assert.equal(card.featureUrl,video.sourceUrl);
    assert.equal(card.image,'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
    assert.match(card.details,/not independently verified/i);
    assert.equal(card.contentBoundary,'general-media');
    assert.equal(findSourceCard(card.id)?.id,card.id);
    assert.ok(isPublicSourceCard(card) && validSourceCard(card));
    assert.ok(ALL_FEED_CARDS.some(c=>c.id===card.id));
    assert.equal(departmentFor(card),'media');
  }
});

test('owner-submitted batch does not claim playback, ownership, licenses or a full channel archive',()=>{
  const seen=new Set();
  for(const video of REVIEWED_OWNER_VIDEO_LINKS){
    assert.ok(!seen.has(video.videoId),'duplicate video '+video.videoId);
    seen.add(video.videoId);
  }
  for(const id of ids){
    const video=REVIEWED_OWNER_VIDEO_LINKS.find(v=>v.videoId===id);
    assert.ok(video);
    assert.equal(validateOwnerYouTubeLink({...video,sourceUrl:'https://youtube.com.evil.test/watch?v='+id}),false);
    assert.equal(validateOwnerYouTubeLink({...video,publisherVerified:true}),false);
    assert.equal(validateOwnerYouTubeLink({...video,titleVerified:true}),false);
  }
});
