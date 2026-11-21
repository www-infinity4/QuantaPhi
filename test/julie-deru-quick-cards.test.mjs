import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JULIE_DERU_CHANNEL,JULIE_DERU_VIDEO_DATABASE,JULIE_DERU_SOURCES,validateJulieDeruVideo,searchJulieDeruVideos} from '../julie-deru-catalog.mjs';
import {findSourceCard,isPublicSourceCard,validSourceCard} from '../source-quick-cards.mjs';
import {ALL_FEED_CARDS} from '../quanta-feed.mjs';
import {departmentFor} from '../quanta-context-placement.mjs';

test('owner Julie Deru video and official publisher channel use canonical verified YouTube URLs',()=>{
 assert.equal(JULIE_DERU_CHANNEL.channelId,'UCt_P3xPrrnOkYT5UQQ4vUIg');
 assert.equal(JULIE_DERU_CHANNEL.profileUrl,'https://www.youtube.com/@JulieDeru');
 assert.equal(JULIE_DERU_VIDEO_DATABASE.coverage.complete,false);
 assert.equal(JULIE_DERU_VIDEO_DATABASE.coverage.communityPostsIndexed,false);
 assert.ok(JULIE_DERU_VIDEO_DATABASE.videos.length>=1);
 const owner=JULIE_DERU_VIDEO_DATABASE.videos.find(x=>x.videoId==='G6zpr59jEas');
 assert.equal(owner?.title,'We Started Ripping Trees Out… This Got Interesting!');
 assert.equal(owner.sourceUrl,'https://www.youtube.com/watch?v=G6zpr59jEas');
 for(const item of JULIE_DERU_VIDEO_DATABASE.videos){
  assert.ok(validateJulieDeruVideo(item),item.videoId);
  assert.equal(item.publishedAt,null);
  assert.equal(item.channelId,JULIE_DERU_CHANNEL.channelId);
  assert.equal(item.sourceUrl,'https://www.youtube.com/watch?v='+item.videoId);
 }
});
test('Julie Deru source checks reject link spoofing, incorrect channel and invented dates',()=>{
 const owner=JULIE_DERU_VIDEO_DATABASE.videos[0];
 assert.equal(validateJulieDeruVideo({...owner,channelId:'other-channel'}),false);
 assert.equal(validateJulieDeruVideo({...owner,sourceUrl:'https://www.youtube.com.evil.test/watch?v='+owner.videoId}),false);
 assert.equal(validateJulieDeruVideo({...owner,videoId:'INVALID'}),false);
 assert.equal(validateJulieDeruVideo({...owner,publishedAt:'2026-11-13'}),false);
 assert.equal(validateJulieDeruVideo({...owner,title:'<script>x</script>'}),false);
 assert.equal(searchJulieDeruVideos('not-an-upload-ever-4172').length,0);
 assert.equal(searchJulieDeruVideos('trees')[0]?.videoId,'G6zpr59jEas');
});
test('Julie Deru gets searchable channel and separate source-backed video Oracle cards',()=>{
 assert.equal(JULIE_DERU_SOURCES.length,1+JULIE_DERU_VIDEO_DATABASE.videos.length);
 const ids=new Set();
 for(const card of JULIE_DERU_SOURCES){
  assert.ok(!ids.has(card.id));ids.add(card.id);
  assert.equal(findSourceCard(card.id)?.id,card.id);
  assert.equal(isPublicSourceCard(card),true);
  assert.equal(validSourceCard(card),true);
  assert.equal(departmentFor(card),'media');
  assert.ok(ALL_FEED_CARDS.some(c=>c.id===card.id));
 }
 assert.equal(JULIE_DERU_SOURCES[0].id,'julie-deru-youtube');
 const owner=JULIE_DERU_SOURCES.find(c=>c.youtubeVideoId==='G6zpr59jEas');
 assert.equal(owner?.image,'https://i.ytimg.com/vi/G6zpr59jEas/hqdefault.jpg');
});
test('Julie Deru reuses Abbe in-card renderer with single opt-in YouTube iframe and channel fallback',()=>{
 const src=readFileSync(new URL('../youtube-creator-cards.mjs',import.meta.url),'utf8');
 assert.match(src,/JULIE_DERU_CHANNEL/);
 assert.match(src,/www\.youtube-nocookie\.com\/embed\//);
 assert.match(src,/Stop playback/);
 assert.match(src,/View original channel/);
 assert.doesNotMatch(src,/autoplay=1/);
});
