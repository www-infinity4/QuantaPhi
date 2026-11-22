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
 assert.ok(REVIEWED_OWNER_VIDEO_LINKS.length>=2,'Owner catalog includes the original two and may grow with new verified source links');
 const v=REVIEWED_OWNER_VIDEO_LINKS.find(item=>item.videoId==='PyUwXoTabPA');
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


test('owner batch View More loads actual additional videos from the saved catalog and verified creators',async()=>{
 const {REVIEWED_OWNER_VIDEO_LINKS,REVIEWED_OWNER_VIDEO_CARDS,validateOwnerYouTubeLink}=await import('../youtube-owner-video-links.mjs');
 for(const id of ['oxVpgLW2k2c','hI_ZLgcCeVU','jZ4Jk4nR94I','O5wUpS5z4SI']){
  const found=REVIEWED_OWNER_VIDEO_LINKS.filter(row=>row.videoId===id);
  assert.equal(found.length,1,'Missing or duplicate owner link '+id);
  const v=found[0];
  assert.equal(v.sourceUrl,'https://www.youtube.com/watch?v='+id);
  assert.equal(v.publishedAt,null);
  assert.equal(v.publisherVerified,false);
  assert.equal(v.titleVerified,false);
  assert.equal(validateOwnerYouTubeLink(v),true);
  const card=REVIEWED_OWNER_VIDEO_CARDS.find(c=>c.reviewedYouTubeVideoId===id);
  assert.ok(card,'Quick Card not generated for '+id);
  assert.ok(isPublicSourceCard(card)&&validSourceCard(card),'Not a valid Public card '+id);
  assert.ok(ALL_FEED_CARDS.some(c=>c.id===card.id),'Missing Oracle feed card '+id);
  assert.equal(departmentFor(card),'media');
 }
 const player=readFileSync(new URL('../quanta-card-experience.mjs',import.meta.url),'utf8');
 const mixed=readFileSync(new URL('../youtube-creator-mixed-card.mjs',import.meta.url),'utf8');
 assert.match(player,/View more videos/,'Each owner video needs a View more control');
 assert.match(player,/initialCreatorChannel:'owner'/,'Open the owner-video feed within the card');
 assert.match(mixed,/REVIEWED_OWNER_VIDEO_LINKS/,'Feed must include the actual owner videos');
 assert.match(mixed,/Load more videos/);
 assert.match(mixed,/\/api\/creator-uploads/,'Must continue fetching recent uploads from known channels');
 assert.match(mixed,/Owner-submitted videos/,'Do not mislabel owner links as a verified channel');
});

test('owner LQXArAgVeqw YouTube link produces one honest Public/Media Quick Card',async()=>{
 const {REVIEWED_OWNER_VIDEO_LINKS,REVIEWED_OWNER_VIDEO_CARDS,validateOwnerYouTubeLink}=await import('../youtube-owner-video-links.mjs');
 const id='LQXArAgVeqw';
 const sources=REVIEWED_OWNER_VIDEO_LINKS.filter(row=>row.videoId===id);
 assert.equal(sources.length,1,'One source record per owner-supplied video');
 const video=sources[0];
 assert.equal(video.sourceUrl,'https://www.youtube.com/watch?v='+id);
 assert.equal(video.observedAt,'2026-11-22');
 assert.equal(video.title,'YouTube video LQXArAgVeqw (title unverified)');
 assert.equal(video.titleVerified,false);
 assert.equal(video.publisherVerified,false);
 assert.equal(video.publishedAt,null);
 assert.equal(video.contentBoundary,'general-media');
 assert.ok(validateOwnerYouTubeLink(video));
 assert.equal(validateOwnerYouTubeLink({...video,publisherVerified:true}),false);
 const card=REVIEWED_OWNER_VIDEO_CARDS.find(row=>row.reviewedYouTubeVideoId===id);
 assert.ok(card,'Source is indexed into a card');
 assert.equal(card.featureUrl,video.sourceUrl);
 assert.equal(card.image,'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
 assert.match(card.details,/not independently verified/i);
 assert.ok(isPublicSourceCard(card) && validSourceCard(card));
 assert.ok(ALL_FEED_CARDS.some(row=>row.id===card.id),'Card appears in Oracle feed');
 assert.equal(departmentFor(card),'media');
});

test('owner c0YDTPOmiCM link produces one source-only Oracle Public/Media Quick Card',async()=>{
 const {REVIEWED_OWNER_VIDEO_LINKS,REVIEWED_OWNER_VIDEO_CARDS,validateOwnerYouTubeLink}=await import('../youtube-owner-video-links.mjs');
 const id='c0YDTPOmiCM';
 const rows=REVIEWED_OWNER_VIDEO_LINKS.filter(v=>v.videoId===id);
 assert.equal(rows.length,1,'One source record per owner-supplied video');
 const v=rows[0];
 assert.equal(v.sourceUrl,'https://www.youtube.com/watch?v='+id);
 assert.equal(v.observedAt,'2026-11-22');
 assert.equal(v.title,'YouTube video c0YDTPOmiCM (title unverified)');
 assert.equal(v.titleVerified,false);
 assert.equal(v.publisherVerified,false);
 assert.equal(v.publishedAt,null);
 assert.equal(v.contentBoundary,'general-media');
 assert.ok(validateOwnerYouTubeLink(v));
 const card=REVIEWED_OWNER_VIDEO_CARDS.find(c=>c.reviewedYouTubeVideoId===id);
 assert.ok(card&&isPublicSourceCard(card)&&validSourceCard(card));
 assert.equal(card.image,'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
 assert.match(card.details,/not independently verified/i);
 assert.ok(ALL_FEED_CARDS.some(c=>c.id===card.id));
 assert.equal(departmentFor(card),'media');
});

test('owner GCoFEjd_eFI video creates one public Media Quick Card without invented video metadata',async()=>{
 const {REVIEWED_OWNER_VIDEO_LINKS,REVIEWED_OWNER_VIDEO_CARDS,validateOwnerYouTubeLink}=await import('../youtube-owner-video-links.mjs');
 const id='GCoFEjd_eFI';
 const rows=REVIEWED_OWNER_VIDEO_LINKS.filter(row=>row.videoId===id);
 assert.equal(rows.length,1,'Exactly one owner-supplied source link');
 const v=rows[0];
 assert.equal(v.sourceUrl,'https://www.youtube.com/watch?v='+id);
 assert.equal(v.observedAt,'2026-11-22');
 assert.equal(v.title,'YouTube video GCoFEjd_eFI (title unverified)');
 assert.equal(v.titleVerified,false);
 assert.equal(v.publisherVerified,false);
 assert.equal(v.publishedAt,null);
 assert.equal(v.contentBoundary,'general-media');
 assert.ok(validateOwnerYouTubeLink(v));
 const cards=REVIEWED_OWNER_VIDEO_CARDS.filter(card=>card.reviewedYouTubeVideoId===id);
 assert.equal(cards.length,1,'One video card, not a duplicate video player');
 const card=cards[0];
 assert.equal(card.featureUrl,v.sourceUrl);
 assert.equal(card.image,'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
 assert.match(card.details,/not independently verified/i);
 assert.ok(isPublicSourceCard(card)&&validSourceCard(card));
 assert.ok(ALL_FEED_CARDS.some(row=>row.id===card.id));
 assert.equal(departmentFor(card),'media');
});

test('owner 4EUkH6CzTUA has exactly one source-only Oracle Public/Media Quick Card and a View more feed entry',async()=>{
 const {REVIEWED_OWNER_VIDEO_LINKS,REVIEWED_OWNER_VIDEO_CARDS,validateOwnerYouTubeLink}=await import('../youtube-owner-video-links.mjs');
 const id='4EUkH6CzTUA';
 const rows=REVIEWED_OWNER_VIDEO_LINKS.filter(v=>v.videoId===id);
 assert.equal(rows.length,1,'Owner supplied one video; never drop or duplicate it');
 const video=rows[0];
 assert.equal(video.sourceUrl,'https://www.youtube.com/watch?v='+id);
 assert.equal(video.observedAt,'2026-11-22');
 assert.equal(video.title,'YouTube video '+id+' (title unverified)');
 assert.equal(video.titleVerified,false);
 assert.equal(video.publisherVerified,false);
 assert.equal(video.publishedAt,null);
 assert.equal(video.contentBoundary,'general-media');
 assert.ok(validateOwnerYouTubeLink(video));
 const cards=REVIEWED_OWNER_VIDEO_CARDS.filter(c=>c.reviewedYouTubeVideoId===id);
 assert.equal(cards.length,1);
 const card=cards[0];
 assert.equal(card.image,'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
 assert.ok(isPublicSourceCard(card)&&validSourceCard(card));
 assert.ok(ALL_FEED_CARDS.some(c=>c.id===card.id));
 assert.equal(departmentFor(card),'media');
 assert.match(card.details,/not independently verified/i);
 const mixed=readFileSync(new URL('../youtube-creator-mixed-card.mjs',import.meta.url),'utf8');
 assert.match(mixed,/REVIEWED_OWNER_VIDEO_LINKS/);
 assert.match(mixed,/Load more videos/);
});

test('owner screenshot The Shires Daddy\'s Little Girl has one source-backed public media Quick Card',async()=>{
 const {REVIEWED_OWNER_VIDEO_LINKS,REVIEWED_OWNER_VIDEO_CARDS,validateOwnerYouTubeLink}=await import('../youtube-owner-video-links.mjs');
 const id='rMNS9oNCL3s';
 const sources=REVIEWED_OWNER_VIDEO_LINKS.filter(v=>v.videoId===id);
 assert.equal(sources.length,1,'Exactly one original video link should be indexed');
 const v=sources[0];
 assert.equal(v.title,"The Shires - Daddy's Little Girl");
 assert.equal(v.sourceUrl,'https://www.youtube.com/watch?v='+id);
 assert.equal(v.observedAt,'2026-11-22');
 assert.equal(v.publishedAt,null);
 assert.equal(v.publisherVerified,false);
 assert.equal(v.contentBoundary,'general-media');
 assert.ok(validateOwnerYouTubeLink(v));
 const cards=REVIEWED_OWNER_VIDEO_CARDS.filter(c=>c.reviewedYouTubeVideoId===id);
 assert.equal(cards.length,1);
 const card=cards[0];
 assert.equal(card.image,'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
 assert.ok(isPublicSourceCard(card)&&validSourceCard(card));
 assert.ok(ALL_FEED_CARDS.some(c=>c.id===card.id));
 assert.equal(departmentFor(card),'media');
 const player=readFileSync(new URL('../quanta-card-experience.mjs',import.meta.url),'utf8');
 assert.match(player,/View more videos/);
});

test('owner G2B1dFuhtfY YouTube link produces one original-source Oracle Media Quick Card',async()=>{
 const {REVIEWED_OWNER_VIDEO_LINKS,REVIEWED_OWNER_VIDEO_CARDS,validateOwnerYouTubeLink}=await import('../youtube-owner-video-links.mjs');
 const id='G2B1dFuhtfY';
 const rows=REVIEWED_OWNER_VIDEO_LINKS.filter(row=>row.videoId===id);
 assert.equal(rows.length,1,'Exactly one verified-source entry for this user-supplied link');
 const video=rows[0];
 assert.equal(video.title,'We Adopted Another Baby!');
 assert.equal(video.sourceUrl,'https://www.youtube.com/watch?v='+id);
 assert.equal(video.observedAt,'2026-11-22');
 assert.equal(video.publisherVerified,false,'Title lookup is not publisher verification');
 assert.equal(video.publishedAt,null,'Never invent exact publication date');
 assert.equal(video.contentBoundary,'general-media');
 assert.ok(validateOwnerYouTubeLink(video));
 const cards=REVIEWED_OWNER_VIDEO_CARDS.filter(card=>card.reviewedYouTubeVideoId===id);
 assert.equal(cards.length,1,'One reusable card, not another player');
 const card=cards[0];
 assert.equal(card.image,'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
 assert.ok(isPublicSourceCard(card) && validSourceCard(card));
 assert.ok(ALL_FEED_CARDS.some(row=>row.id===card.id));
 assert.equal(departmentFor(card),'media');
});


test('owner bDZam9unNYk is exactly one source-only Public/Media Quick Card with View More feed coverage',async()=>{
 const {REVIEWED_OWNER_VIDEO_LINKS,REVIEWED_OWNER_VIDEO_CARDS,validateOwnerYouTubeLink}=await import('../youtube-owner-video-links.mjs');
 const id='bDZam9unNYk';
 const links=REVIEWED_OWNER_VIDEO_LINKS.filter(row=>row.videoId===id);
 assert.equal(links.length,1,'Do not drop or duplicate owner-supplied video');
 const video=links[0];
 assert.equal(video.sourceUrl,'https://www.youtube.com/watch?v='+id);
 assert.equal(video.observedAt,'2026-11-22');
 assert.equal(video.title,'YouTube video '+id+' (title unverified)');
 assert.equal(video.titleVerified,false);
 assert.equal(video.publisherVerified,false);
 assert.equal(video.publishedAt,null);
 assert.equal(video.contentBoundary,'general-media');
 assert.ok(validateOwnerYouTubeLink(video));
 const cards=REVIEWED_OWNER_VIDEO_CARDS.filter(card=>card.reviewedYouTubeVideoId===id);
 assert.equal(cards.length,1,'Reuse existing Oracle source card, not a second player');
 const card=cards[0];
 assert.equal(card.featureUrl,video.sourceUrl);
 assert.equal(card.image,'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
 assert.match(card.details,/not independently verified/i);
 assert.ok(isPublicSourceCard(card)&&validSourceCard(card));
 assert.ok(ALL_FEED_CARDS.some(row=>row.id===card.id));
 assert.equal(departmentFor(card),'media');
 const mixed=readFileSync(new URL('../youtube-creator-mixed-card.mjs',import.meta.url),'utf8');
 assert.match(mixed,/REVIEWED_OWNER_VIDEO_LINKS/);
 assert.match(mixed,/Load more videos/);
});


test('owner-featured Love Rose source is first among owner-submitted videos with truthful unverified metadata',async()=>{
 const {REVIEWED_OWNER_VIDEO_LINKS,REVIEWED_OWNER_VIDEO_CARDS,validateOwnerYouTubeLink}=await import('../youtube-owner-video-links.mjs');
 const id='d_nGb3NXIKA';
 const hits=REVIEWED_OWNER_VIDEO_LINKS.filter(v=>v.videoId===id);
 assert.equal(hits.length,1,'One deduplicated owner-requested link');
 const video=hits[0];
 assert.equal(REVIEWED_OWNER_VIDEO_LINKS[0].videoId,id,'Owner requested top position in owner video feed');
 assert.equal(video.title,'Love Rose · owner label (YouTube title unverified)');
 assert.equal(video.titleVerified,false);
 assert.equal(video.publisherVerified,false);
 assert.equal(video.publishedAt,null);
 assert.equal(video.sourceUrl,'https://www.youtube.com/watch?v='+id);
 assert.equal(video.contentBoundary,'general-media');
 assert.equal(validateOwnerYouTubeLink(video),true);
 const card=REVIEWED_OWNER_VIDEO_CARDS.find(c=>c.reviewedYouTubeVideoId===id);
 assert.ok(card,'The original shared Quick Card must be generated');
 assert.equal(REVIEWED_OWNER_VIDEO_CARDS[0].reviewedYouTubeVideoId,id);
 assert.equal(card.image,'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
 assert.ok(isPublicSourceCard(card));
 assert.ok(validSourceCard(card));
 assert.ok(ACTIVE_SOURCE_CARDS.some(c=>c.id===card.id));
 assert.ok(ALL_FEED_CARDS.some(c=>c.id===card.id));
 assert.equal(departmentFor(card),'media');
});
