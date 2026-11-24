import test from 'node:test';
import assert from 'node:assert/strict';
import {REVIEWED_OWNER_VIDEO_LINKS, REVIEWED_OWNER_VIDEO_CARDS, validateOwnerYouTubeLink} from '../youtube-owner-video-links.mjs';
import {findSourceCard, isPublicSourceCard, validSourceCard} from '../source-quick-cards.mjs';
import {ALL_FEED_CARDS} from '../quanta-feed.mjs';
import {CREATOR_CHANNELS,validCreatorVideo} from '../youtube-creator-mixed-core.mjs';
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


test('new 2NLr5ND7BkY YouTube source is a public Media Quick Card with verified URL only',()=>{
  const id='2NLr5ND7BkY';
  const matches=REVIEWED_OWNER_VIDEO_LINKS.filter(row=>row.videoId===id);
  assert.equal(matches.length,1,'User-submitted ID should be kept once');
  const video=matches[0];
  assert.equal(video.sourceUrl,'https://www.youtube.com/watch?v='+id);
  assert.equal(video.observedAt,'2026-11-21');
  assert.equal(video.titleVerified,false);
  assert.equal(video.publisherVerified,false);
  assert.equal(video.publishedAt,null);
  assert.equal(video.contentBoundary,'general-media');
  assert.match(video.title,/title unverified/i);
  assert.ok(validateOwnerYouTubeLink(video));
  assert.equal(validateOwnerYouTubeLink({...video,sourceUrl:'https://youtube.com.evil.test/watch?v='+id}),false);
  const card=REVIEWED_OWNER_VIDEO_CARDS.find(row=>row.reviewedYouTubeVideoId===id);
  assert.ok(card,'Source generates a distinct Quick Card');
  assert.equal(card.featureUrl,video.sourceUrl);
  assert.equal(card.image,'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
  assert.match(card.details,/not independently verified/i);
  assert.ok(isPublicSourceCard(card)&&validSourceCard(card));
  assert.ok(ALL_FEED_CARDS.some(row=>row.id===card.id));
  assert.equal(departmentFor(card),'media');
});


test('two further owner video URLs become distinct Public/Media Quick Cards with honest source provenance',()=>{
  for(const id of ['mrhL0sUO4j0','KOhR7s-lXVY']){
    const matches=REVIEWED_OWNER_VIDEO_LINKS.filter(v=>v.videoId===id);
    assert.equal(matches.length,1,'Each submitted video ID appears once: '+id);
    const v=matches[0];
    assert.equal(v.sourceUrl,'https://www.youtube.com/watch?v='+id);
    assert.equal(v.observedAt,'2026-11-21');
    assert.match(v.title,/title unverified/i);
    assert.equal(v.titleVerified,false);
    assert.equal(v.publisherVerified,false);
    assert.equal(v.publishedAt,null);
    assert.equal(v.contentBoundary,'general-media');
    assert.ok(validateOwnerYouTubeLink(v));
    assert.equal(validateOwnerYouTubeLink({...v,sourceUrl:'https://youtube.com.evil.test/watch?v='+id}),false);
    const c=REVIEWED_OWNER_VIDEO_CARDS.find(row=>row.reviewedYouTubeVideoId===id);
    assert.ok(c,'Owner link creates a Quick Card for '+id);
    assert.equal(c.featureUrl,v.sourceUrl);
    assert.equal(c.image,'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
    assert.match(c.details,/not independently verified/i);
    assert.ok(isPublicSourceCard(c) && validSourceCard(c));
    assert.equal(findSourceCard(c.id)?.id,c.id);
    assert.ok(ALL_FEED_CARDS.some(row=>row.id===c.id));
    assert.equal(departmentFor(c),'media');
  }
});


test('two new November 21 owner YouTube links each register one source-backed public Media card',()=>{
  for(const id of ['2SmFV8-IXC4','y7kPyfpiIME']){
    const sources=REVIEWED_OWNER_VIDEO_LINKS.filter(row=>row.videoId===id);
    assert.equal(sources.length,1,'Exactly one reviewed source link '+id);
    const video=sources[0];
    assert.equal(video.sourceUrl,'https://www.youtube.com/watch?v='+id);
    assert.equal(video.observedAt,'2026-11-21');
    assert.match(video.title,/title unverified/i);
    assert.equal(video.titleVerified,false);
    assert.equal(video.publisherVerified,false);
    assert.equal(video.publishedAt,null);
    assert.equal(video.contentBoundary,'general-media');
    assert.equal(validateOwnerYouTubeLink(video),true);
    assert.equal(validateOwnerYouTubeLink({...video,sourceUrl:'https://youtube.com.evil.test/watch?v='+id}),false);
    assert.equal(validateOwnerYouTubeLink({...video,publisherVerified:true}),false);
    const card=REVIEWED_OWNER_VIDEO_CARDS.find(row=>row.reviewedYouTubeVideoId===id);
    assert.ok(card,'Public Quick Card exists for '+id);
    assert.equal(card.featureUrl,video.sourceUrl);
    assert.equal(card.image,'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
    assert.match(card.details,/not independently verified/i);
    assert.ok(validSourceCard(card)&&isPublicSourceCard(card));
    assert.equal(findSourceCard(card.id)?.id,card.id);
    assert.ok(ALL_FEED_CARDS.some(row=>row.id===card.id));
    assert.equal(departmentFor(card),'media');
  }
});


test('owner video GuT4DmGeuS0 is represented once as a source-linked Oracle Media card',()=>{
  const id='GuT4DmGeuS0';
  const records=REVIEWED_OWNER_VIDEO_LINKS.filter(row=>row.videoId===id);
  assert.equal(records.length,1,'Do not duplicate user source ID');
  const v=records[0];
  assert.equal(v.sourceUrl,'https://www.youtube.com/watch?v='+id);
  assert.equal(v.observedAt,'2026-11-21');
  assert.match(v.title,/title unverified/i);
  assert.equal(v.titleVerified,false);
  assert.equal(v.publisherVerified,false);
  assert.equal(v.publishedAt,null);
  assert.equal(v.contentBoundary,'general-media');
  assert.equal(validateOwnerYouTubeLink(v),true);
  assert.equal(validateOwnerYouTubeLink({...v,sourceUrl:'https://youtube.com.evil.test/watch?v='+id}),false);
  const card=REVIEWED_OWNER_VIDEO_CARDS.find(row=>row.reviewedYouTubeVideoId===id);
  assert.ok(card,'The existing card factory should render the link');
  assert.equal(card.featureUrl,v.sourceUrl);
  assert.equal(card.image,'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
  assert.match(card.details,/not independently verified/i);
  assert.ok(isPublicSourceCard(card)&&validSourceCard(card));
  assert.equal(findSourceCard(card.id)?.id,card.id);
  assert.ok(ALL_FEED_CARDS.some(row=>row.id===card.id));
  assert.equal(departmentFor(card),'media');
});


test('Brittikitty Lily source opens as one original-video Public/Media Quick Card',()=>{
  const id='eikANmw714k';
  const matches=REVIEWED_OWNER_VIDEO_LINKS.filter(v=>v.videoId===id);
  assert.equal(matches.length,1,'The submitted video must not duplicate');
  const video=matches[0];
  assert.equal(video.title,'Lily can literally fall asleep everywhere and anywhere 😂😂');
  assert.equal(video.sourceUrl,'https://www.youtube.com/watch?v='+id);
  assert.equal(video.observedAt,'2026-11-21');
  assert.equal(video.publisherVerified,false,'Channel ownership remains unverified');
  assert.equal(video.publishedAt,null,'Do not infer publication date from the link');
  assert.equal(video.contentBoundary,'general-media');
  assert.ok(validateOwnerYouTubeLink(video));
  const card=REVIEWED_OWNER_VIDEO_CARDS.find(c=>c.reviewedYouTubeVideoId===id);
  assert.ok(card,'The original YouTube video must render in the existing source-card factory');
  assert.equal(card.featureUrl,video.sourceUrl);
  assert.equal(card.image,'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
  assert.equal(findSourceCard(card.id)?.id,card.id);
  assert.ok(isPublicSourceCard(card)&&validSourceCard(card));
  assert.ok(ALL_FEED_CARDS.some(c=>c.id===card.id));
  assert.equal(departmentFor(card),'media');
});


test('Brittikitty creator selector opens original channel without inventing RSS access',()=>{
 const channel=CREATOR_CHANNELS.find(c=>c.key==='brittikitty');
 assert.ok(channel,'Channel must be available in the existing mixed creator selector');
 assert.equal(channel.name,'Brittikitty');
 assert.equal(channel.url,'https://www.youtube.com/@brittikitty');
 assert.equal(channel.channelId,null,'Do not invent a canonical UC channel ID');
 assert.equal(channel.seed.length,1,'A single original video is actually identified');
 assert.equal(channel.seed[0].videoId,'eikANmw714k');
 assert.ok(validCreatorVideo(channel.seed[0]));
});


test('girls make a treat original video is linked once as an Oracle Public/Media Quick Card',()=>{
  const id='Cmar9xsX7AU';
  const matches=REVIEWED_OWNER_VIDEO_LINKS.filter(row=>row.videoId===id);
  assert.equal(matches.length,1,'One owner-submitted video, without duplicates');
  const video=matches[0];
  assert.equal(video.title,'The girls make a treat - July 1, 2024');
  assert.equal(video.sourceUrl,'https://www.youtube.com/watch?v='+id);
  assert.equal(video.observedAt,'2026-11-21');
  assert.equal(video.publisherVerified,false,'Publisher is not yet verified');
  assert.equal(video.publishedAt,null,'Title date is not verified publish date');
  assert.equal(video.contentBoundary,'general-media');
  assert.ok(validateOwnerYouTubeLink(video));
  assert.equal(validateOwnerYouTubeLink({...video,sourceUrl:'https://youtube.com.evil.test/watch?v='+id}),false);
  const card=REVIEWED_OWNER_VIDEO_CARDS.find(row=>row.reviewedYouTubeVideoId===id);
  assert.ok(card,'Existing factory must expose original video Quick Card');
  assert.equal(card.featureUrl,video.sourceUrl);
  assert.equal(card.image,'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
  assert.equal(findSourceCard(card.id)?.id,card.id);
  assert.ok(isPublicSourceCard(card)&&validSourceCard(card));
  assert.ok(ALL_FEED_CARDS.some(row=>row.id===card.id));
  assert.equal(departmentFor(card),'media');
});


test('owner YouTube Short o5ErK3nEpKU creates one Public Media Quick Card without unsupported creator claims',()=>{
  const id='o5ErK3nEpKU';
  const matches=REVIEWED_OWNER_VIDEO_LINKS.filter(v=>v.videoId===id);
  assert.equal(matches.length,1,'Keep the owner-submitted Short once');
  const video=matches[0];
  assert.equal(video.sourceUrl,'https://www.youtube.com/watch?v='+id);
  assert.equal(video.observedAt,'2026-11-21');
  assert.match(video.title,/title unverified/i);
  assert.equal(video.titleVerified,false);
  assert.equal(video.publisherVerified,false);
  assert.equal(video.publishedAt,null);
  assert.equal(video.contentBoundary,'general-media');
  assert.ok(validateOwnerYouTubeLink(video));
  assert.equal(validateOwnerYouTubeLink({...video,sourceUrl:'https://youtube.com.evil.test/watch?v='+id}),false);
  const card=REVIEWED_OWNER_VIDEO_CARDS.find(c=>c.reviewedYouTubeVideoId===id);
  assert.ok(card,'Use the existing Oracle source-card factory');
  assert.equal(card.featureUrl,video.sourceUrl);
  assert.equal(card.image,'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
  assert.match(card.details,/not independently verified/i);
  assert.ok(isPublicSourceCard(card)&&validSourceCard(card));
  assert.equal(findSourceCard(card.id)?.id,card.id);
  assert.ok(ALL_FEED_CARDS.some(c=>c.id===card.id));
  assert.equal(departmentFor(card),'media');
});


test('new owner-submitted video AhhDT0AkqC0 is added once to Public Media Quick Cards without guessed metadata',()=>{
  const id='AhhDT0AkqC0';
  const rows=REVIEWED_OWNER_VIDEO_LINKS.filter(v=>v.videoId===id);
  assert.equal(rows.length,1,'Only one owner-submitted entry');
  const video=rows[0];
  assert.equal(video.sourceUrl,'https://www.youtube.com/watch?v='+id);
  assert.equal(video.observedAt,'2026-11-21');
  assert.equal(video.titleVerified,false);
  assert.equal(video.publisherVerified,false);
  assert.equal(video.publishedAt,null);
  assert.equal(video.contentBoundary,'general-media');
  assert.match(video.title,/title unverified/i);
  assert.ok(validateOwnerYouTubeLink(video));
  assert.equal(validateOwnerYouTubeLink({...video,sourceUrl:'https://youtube.com.evil.test/watch?v='+id}),false);
  const card=REVIEWED_OWNER_VIDEO_CARDS.find(v=>v.reviewedYouTubeVideoId===id);
  assert.ok(card,'Existing Quick Card factory must generate video entry');
  assert.equal(card.featureUrl,video.sourceUrl);
  assert.equal(card.image,'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
  assert.match(card.details,/not independently verified/i);
  assert.ok(isPublicSourceCard(card)&&validSourceCard(card));
  assert.equal(findSourceCard(card.id)?.id,card.id);
  assert.ok(ALL_FEED_CARDS.some(v=>v.id===card.id));
  assert.equal(departmentFor(card),'media');
});


test('owner YouTube video YpFf6N0Ewa4 is indexed exactly once in existing Oracle Public/Media cards',()=>{
  const id='YpFf6N0Ewa4';
  const matches=REVIEWED_OWNER_VIDEO_LINKS.filter(row=>row.videoId===id);
  assert.equal(matches.length,1,'Preserve the owner-supplied YouTube video exactly once');
  const video=matches[0];
  assert.equal(video.sourceUrl,'https://www.youtube.com/watch?v='+id);
  assert.equal(video.observedAt,'2026-11-21');
  assert.equal(video.titleVerified,false,'Do not invent unverified public metadata');
  assert.match(video.title,/title unverified/i);
  assert.equal(video.publisherVerified,false);
  assert.equal(video.publishedAt,null);
  assert.equal(video.contentBoundary,'general-media');
  assert.ok(validateOwnerYouTubeLink(video));
  assert.equal(validateOwnerYouTubeLink({...video,sourceUrl:'https://evil.test/watch?v='+id}),false);
  assert.equal(validateOwnerYouTubeLink({...video,publisherVerified:true}),false);
  const card=REVIEWED_OWNER_VIDEO_CARDS.find(row=>row.reviewedYouTubeVideoId===id);
  assert.ok(card,'Reuse the existing Oracle Quick Card factory');
  assert.equal(card.featureUrl,video.sourceUrl);
  assert.equal(card.image,'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
  assert.match(card.details,/not independently verified/i);
  assert.ok(isPublicSourceCard(card)&&validSourceCard(card));
  assert.equal(findSourceCard(card.id)?.id,card.id);
  assert.ok(ALL_FEED_CARDS.some(row=>row.id===card.id));
  assert.equal(departmentFor(card),'media');
});


test('owner video _9UqlGS0O1M produces exactly one source-backed Public/Media Quick Card',()=>{
  const id='_9UqlGS0O1M';
  const videos=REVIEWED_OWNER_VIDEO_LINKS.filter(row=>row.videoId===id);
  assert.equal(videos.length,1,'No missing or duplicate owner video');
  const video=videos[0];
  assert.equal(video.sourceUrl,'https://www.youtube.com/watch?v='+id);
  assert.equal(video.observedAt,'2026-11-21');
  assert.match(video.title,/title unverified/i);
  assert.equal(video.titleVerified,false);
  assert.equal(video.publisherVerified,false);
  assert.equal(video.publishedAt,null);
  assert.equal(video.contentBoundary,'general-media');
  assert.ok(validateOwnerYouTubeLink(video));
  assert.equal(validateOwnerYouTubeLink({...video,publisherVerified:true}),false);
  assert.equal(validateOwnerYouTubeLink({...video,sourceUrl:'https://other.example/watch?v='+id}),false);
  const card=REVIEWED_OWNER_VIDEO_CARDS.find(row=>row.reviewedYouTubeVideoId===id);
  assert.ok(card,'Reuse existing original-source Quick Card factory');
  assert.equal(card.featureUrl,video.sourceUrl);
  assert.equal(card.image,'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
  assert.match(card.details,/not independently verified/i);
  assert.ok(isPublicSourceCard(card)&&validSourceCard(card));
  assert.equal(findSourceCard(card.id)?.id,card.id);
  assert.ok(ALL_FEED_CARDS.some(row=>row.id===card.id));
  assert.equal(departmentFor(card),'media');
});


test('Nov 22 owner-submitted djgY5YE6RKU registers one original-video Quick Card without invented metadata',()=>{
 const id='djgY5YE6RKU';
 const rows=REVIEWED_OWNER_VIDEO_LINKS.filter(v=>v.videoId===id);
 assert.equal(rows.length,1,'Owner link must appear once');
 const v=rows[0];
 assert.equal(v.sourceUrl,'https://www.youtube.com/watch?v='+id);
 assert.equal(v.observedAt,'2026-11-22');
 assert.equal(v.titleVerified,false);
 assert.equal(v.publisherVerified,false);
 assert.equal(v.publishedAt,null);
 assert.equal(v.contentBoundary,'general-media');
 assert.ok(validateOwnerYouTubeLink(v));
 const c=REVIEWED_OWNER_VIDEO_CARDS.find(row=>row.reviewedYouTubeVideoId===id);
 assert.ok(c,'Existing source-card generator should produce a standalone card');
 assert.equal(c.featureUrl,v.sourceUrl);
 assert.ok(validSourceCard(c)&&isPublicSourceCard(c));
 assert.equal(findSourceCard(c.id)?.id,c.id);
 assert.ok(ALL_FEED_CARDS.some(row=>row.id===c.id));
 assert.equal(departmentFor(c),'media');
});


test('Nov 24 exact owner video DL6EKfSqOa4 creates one Oracle Public Media card',()=>{
 const id='DL6EKfSqOa4';
 const records=REVIEWED_OWNER_VIDEO_LINKS.filter(v=>v.videoId===id);
 assert.equal(records.length,1);
 const v=records[0];
 assert.equal(v.sourceUrl,'https://www.youtube.com/watch?v='+id);
 assert.equal(v.observedAt,'2026-11-24');
 assert.equal(v.titleVerified,false);
 assert.equal(v.publisherVerified,false);
 assert.equal(v.publishedAt,null);
 assert.ok(validateOwnerYouTubeLink(v));
 const cards=REVIEWED_OWNER_VIDEO_CARDS.filter(c=>c.reviewedYouTubeVideoId===id);
 assert.equal(cards.length,1);
 const c=cards[0];
 assert.equal(c.featureUrl,v.sourceUrl);
 assert.equal(c.image,'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
 assert.ok(isPublicSourceCard(c)&&validSourceCard(c));
 assert.equal(findSourceCard(c.id)?.id,c.id);
 assert.equal(ALL_FEED_CARDS.filter(row=>row.id===c.id).length,1);
 assert.equal(departmentFor(c),'media');
});
