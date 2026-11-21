import test from 'node:test';
import assert from 'node:assert/strict';
import {
 REVIEWED_OWNER_VIDEO_LINKS,
 REVIEWED_OWNER_VIDEO_CARDS,
 validateOwnerYouTubeLink
} from '../youtube-owner-video-links.mjs';

test('new owner YouTube link creates an attributed, non-fabricated Oracle Quick Card',()=>{
 const id='QR_c5m1RLtk';
 const source=REVIEWED_OWNER_VIDEO_LINKS.find(v=>v.videoId===id);
 assert.ok(source,'Owner supplied the video link; metadata discovery must not erase it');
 assert.equal(source.sourceUrl,'https://www.youtube.com/watch?v='+id);
 assert.equal(source.observedAt,'2026-11-21');
 assert.equal(source.publishedAt,null);
 assert.equal(source.publisherVerified,false);
 assert.equal(source.sourceMetadataVerified,false);
 assert.match(source.title,/title unverified/i);
 assert.equal(validateOwnerYouTubeLink(source),true);
 assert.equal(validateOwnerYouTubeLink({...source,sourceMetadataVerified:true}),false,
  'The owner-provided URL alone must not establish verified channel or title data');
 const card=REVIEWED_OWNER_VIDEO_CARDS.find(c=>c.reviewedYouTubeVideoId===id);
 assert.ok(card,'Card must be included in the existing Oracle source-bank feed');
 assert.equal(card.featureUrl,source.sourceUrl);
 assert.equal(card.image,'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
 assert.equal(card.contentBoundary,'general-media');
 assert.match(card.details,/not independently verified/i);
});
