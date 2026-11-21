import test from 'node:test';
import assert from 'node:assert/strict';
import {YOUTUBE_CHANNEL,YOUTUBE_VIDEO_DATABASE,YOUTUBE_CREATOR_SOURCES,validateYouTubeVideo,mergeYouTubeVideos,searchYouTubeVideos} from '../youtube-creator-catalog.mjs';
import {ACTIVE_SOURCE_CARDS,findSourceCard,isPublicSourceCard,validSourceCard} from '../source-quick-cards.mjs';
import {ALL_FEED_CARDS} from '../quanta-feed.mjs';
import {departmentFor} from '../quanta-context-placement.mjs';
import {readFileSync} from 'node:fs';

const first=YOUTUBE_VIDEO_DATABASE.videos.find(v=>v.videoId==='cF6XusNOfjM');
test('reviewed AbbeCAdventures snapshot has exactly 11 observed original video IDs, not a complete channel archive',()=>{
 assert.equal(YOUTUBE_CHANNEL.channelId,'UCFsg41h5GN7TAxFUK3Sl00w');
 assert.equal(YOUTUBE_CHANNEL.profileUrl,'https://www.youtube.com/@abbecadventures');
 assert.equal(YOUTUBE_VIDEO_DATABASE.coverage.complete,false);
 assert.equal(YOUTUBE_VIDEO_DATABASE.coverage.communityPostsIndexed,false);
 assert.equal(YOUTUBE_VIDEO_DATABASE.videos.length,11);
 assert.equal(new Set(YOUTUBE_VIDEO_DATABASE.videos.map(v=>v.videoId)).size,11);
 assert.equal(first.title,'A Day in My Life as an In-Home Daycare Provider | Real Daycare Routine');
 for(const item of YOUTUBE_VIDEO_DATABASE.videos){
  assert.ok(validateYouTubeVideo(item),item.videoId);
  assert.equal(item.sourceUrl,'https://www.youtube.com/watch?v='+item.videoId);
  assert.equal(item.channelId,YOUTUBE_CHANNEL.channelId);
  assert.equal(item.publishedAt,null,'Do not invent exact dates from relative YouTube dates');
 }
});
test('source validator rejects host spoofing, mismatched video IDs, unsafe titles and fabricated timestamps',()=>{
 assert.equal(validateYouTubeVideo({...first,sourceUrl:'https://youtube.com.attacker.test/watch?v='+first.videoId}),false);
 assert.equal(validateYouTubeVideo({...first,sourceUrl:'https://www.youtube.com/watch?v=AAAAAAAAAAA'}),false);
 assert.equal(validateYouTubeVideo({...first,channelId:'OTHER_CHANNEL'}),false);
 assert.equal(validateYouTubeVideo({...first,title:'<script>alert(1)</script>'}),false);
 assert.equal(validateYouTubeVideo({...first,publishedAt:'2027-01-01T00:00:00Z'}),false);
 assert.throws(()=>mergeYouTubeVideos([],[{...first,sourceUrl:'javascript:alert(1)'}]),/Invalid/);
 const merged=mergeYouTubeVideos(YOUTUBE_VIDEO_DATABASE.videos,[first,first]);
 assert.equal(merged.length,11);
 assert.equal(mergeYouTubeVideos([],[{...first,untrusted:'drop'}])[0].untrusted,undefined);
});
test('search sorts and filters reviewed titles without pretending to have full uploads or Community posts',()=>{
 assert.ok(searchYouTubeVideos('daycare').length>=3);
 assert.equal(searchYouTubeVideos('not-a-real-query-837482').length,0);
 assert.equal(searchYouTubeVideos(' GROCERY ')[0].videoId,'hcry6kyERMI');
});
test('channel and individual video Quick Cards join original public Oracle source bank',()=>{
 assert.equal(YOUTUBE_CREATOR_SOURCES.length,12);
 for(const card of YOUTUBE_CREATOR_SOURCES){
  assert.ok(isPublicSourceCard(card),card.id);
  assert.ok(validSourceCard(card),card.id);
  assert.equal(findSourceCard(card.id).id,card.id);
  assert.ok(ACTIVE_SOURCE_CARDS.some(c=>c.id===card.id));
  assert.ok(ALL_FEED_CARDS.some(c=>c.id===card.id));
  assert.equal(departmentFor(card),'media');
 }
 const original=YOUTUBE_CREATOR_SOURCES.find(c=>c.youtubeVideoId==='cF6XusNOfjM');
 assert.ok(original);
 assert.equal(original.featureUrl,'https://www.youtube.com/watch?v=cF6XusNOfjM');
 assert.equal(original.image,'https://i.ytimg.com/vi/cF6XusNOfjM/hqdefault.jpg');
});
test('video cards use only approved click-to-play YouTube embeds and retain direct publisher fallback',()=>{
 const media=readFileSync(new URL('../youtube-creator-cards.mjs',import.meta.url),'utf8');
 const tools=readFileSync(new URL('../quanta-card-experience.mjs',import.meta.url),'utf8');
 assert.match(tools,/mountYouTubeCreatorCard\(root,card\)/);
 assert.match(media,/www\.youtube-nocookie\.com\/embed\//);
 assert.match(media,/Read original on YouTube/);
 assert.match(media,/iframe/);
 assert.doesNotMatch(media,/autoplay=1|localStorage|document\.cookie/);
});


test('owner-linked YouTube video becomes a separate source-backed public Oracle carousel card, not a family or 21+ placement',async()=>{
 const {REVIEWED_OWNER_VIDEO_LINKS,REVIEWED_OWNER_VIDEO_CARDS,validateOwnerYouTubeLink}=await import('../youtube-owner-video-links.mjs');
 assert.equal(REVIEWED_OWNER_VIDEO_LINKS.length,3);
 const v=REVIEWED_OWNER_VIDEO_LINKS[0];
 assert.equal(v.videoId,'PyUwXoTabPA');
 assert.equal(v.title,'REFRESHING! 6-2-2014');
 assert.equal(v.sourceUrl,'https://www.youtube.com/watch?v=PyUwXoTabPA');
 assert.equal(v.publishedAt,null);
 assert.equal(v.publisherVerified,false);
 assert.equal(v.contentBoundary,'general-media');
 assert.equal(validateOwnerYouTubeLink(v),true);
 assert.equal(validateOwnerYouTubeLink({...v,sourceUrl:'https://youtube.com.evil.test/watch?v=PyUwXoTabPA'}),false);
 assert.equal(validateOwnerYouTubeLink({...v,contentBoundary:'adult'}),false);
 assert.equal(validateOwnerYouTubeLink({...v,contentBoundary:'family-education'}),false);
 assert.equal(validateOwnerYouTubeLink({...v,publisherVerified:true}),false);
 const c=REVIEWED_OWNER_VIDEO_CARDS[0];
 assert.ok(c);
 assert.equal(c.reviewedYouTubeVideoId,v.videoId);
 assert.ok(isPublicSourceCard(c));
 assert.ok(validSourceCard(c));
 assert.ok(ACTIVE_SOURCE_CARDS.some(item=>item.id===c.id));
 assert.ok(ALL_FEED_CARDS.some(item=>item.id===c.id));
 assert.equal(departmentFor(c),'media');
});
test('owner video has a click-only embedded player, Stop action, thumbnail and original YouTube fallback',()=>{
 const src=readFileSync(new URL('../quanta-card-experience.mjs',import.meta.url),'utf8');
 assert.match(src,/card\.reviewedYouTubeVideoId/);
 assert.match(src,/field\.value=initialVideo\.sourceUrl/);
 assert.match(src,/Stop playback/);
 assert.match(src,/Original video on YouTube/);
 assert.match(src,/youtube-nocookie\.com\/embed/);
 assert.doesNotMatch(src,/autoplay=1/);
});

test('owner-supplied Samirah video has one public source-linked Oracle Quick Card without invented publication, rights or 21+ claims',async()=>{
 const {REVIEWED_OWNER_VIDEO_LINKS,REVIEWED_OWNER_VIDEO_CARDS,validateOwnerYouTubeLink}=await import('../youtube-owner-video-links.mjs');
 const v=REVIEWED_OWNER_VIDEO_LINKS.find(row=>row.videoId==='UPFgnpkm7MQ');
 assert.ok(v,'Owner link must be in the reviewed catalog');
 assert.equal(v.title,'BREASTFEEDING A TEETHING BABY | Clingy baby | Clean with me | Mum of four');
 assert.equal(v.sourceUrl,'https://www.youtube.com/watch?v=UPFgnpkm7MQ');
 assert.equal(v.observedAt,'2026-11-21');
 assert.equal(v.publishedAt,null);
 assert.equal(v.publisherVerified,false);
 assert.equal(v.contentBoundary,'general-media');
 assert.equal(validateOwnerYouTubeLink(v),true);
 const c=REVIEWED_OWNER_VIDEO_CARDS.find(card=>card.reviewedYouTubeVideoId===v.videoId);
 assert.ok(c,'Dedicated owner video card should exist');
 assert.equal(c.image,'https://i.ytimg.com/vi/UPFgnpkm7MQ/hqdefault.jpg');
 assert.ok(isPublicSourceCard(c));
 assert.ok(validSourceCard(c));
 assert.ok(ALL_FEED_CARDS.some(card=>card.id===c.id));
 assert.equal(departmentFor(c),'media');
});

test('Argo Mill owner Short is indexed in Oracle media without inventing its channel or additional Shorts',async()=>{
 const {REVIEWED_OWNER_VIDEO_LINKS,REVIEWED_OWNER_VIDEO_CARDS,validateOwnerYouTubeLink}=await import('../youtube-owner-video-links.mjs');
 const v=REVIEWED_OWNER_VIDEO_LINKS.find(row=>row.videoId==='bzvtKRteavs');
 assert.ok(v);
 assert.equal(v.title,'#idahosprings #goldmill #goldmine $goldmining #gold');
 assert.equal(v.observedAt,'2026-11-21');
 assert.equal(v.publisherVerified,false);
 assert.equal(v.publishedAt,null);
 assert.equal(v.contentBoundary,'general-media');
 assert.ok(validateOwnerYouTubeLink(v));
 assert.equal(validateOwnerYouTubeLink({...v,shortsRoute:'https://untrusted.example'}),false);
 const c=REVIEWED_OWNER_VIDEO_CARDS.find(card=>card.reviewedYouTubeVideoId===v.videoId);
 assert.ok(c);
 assert.equal(c.secondUrl,'https://www.youtube.com/shorts/bzvtKRteavs');
 assert.equal(c.secondLabel,'Open Shorts link');
 assert.equal(c.name,'Argo Mill Tour · Idaho Springs');
 assert.match(c.details,/not a complete channel archive/);
 assert.ok(isPublicSourceCard(c)&&validSourceCard(c));
 assert.ok(ACTIVE_SOURCE_CARDS.some(card=>card.id===c.id));
 assert.ok(ALL_FEED_CARDS.some(card=>card.id===c.id));
 assert.equal(departmentFor(c),'media');
});
