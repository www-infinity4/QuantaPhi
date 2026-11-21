import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MARIA_CHANNEL,MARIA_VIDEO_DATABASE,MARIA_SOURCES,validateMariaVideo,searchMariaVideos,similarMariaVideos} from '../milky-mama-maria-catalog.mjs';
import {findSourceCard,isPublicSourceCard,validSourceCard} from '../source-quick-cards.mjs';
import {ALL_FEED_CARDS} from '../quanta-feed.mjs';
import {departmentFor} from '../quanta-context-placement.mjs';

test('owner video is attributed to the actual channel, with a partial reviewed index and full publisher lineup link',()=>{
 assert.equal(MARIA_CHANNEL.channelId,'UC0CCO_QHCTRUTsVgb9L0gtQ');
 assert.equal(MARIA_CHANNEL.profileUrl,'https://www.youtube.com/@milkymamamarie');
 assert.equal(MARIA_CHANNEL.videosUrl,'https://www.youtube.com/@milkymamamarie/videos');
 assert.equal(MARIA_VIDEO_DATABASE.coverage.complete,false);
 assert.equal(MARIA_VIDEO_DATABASE.videos.length,3);
 const owner=MARIA_VIDEO_DATABASE.videos.find(v=>v.videoId==='_LcTKx4QSWw');
 assert.equal(owner?.sourceUrl,'https://www.youtube.com/watch?v=_LcTKx4QSWw');
 assert.match(owner?.title||'',/Simple Manual Pump Routine/);
 const ids=new Set();
 for(const row of MARIA_VIDEO_DATABASE.videos){
  assert.ok(validateMariaVideo(row),row.videoId);
  assert.ok(!ids.has(row.videoId));ids.add(row.videoId);
  assert.equal(row.channelId,MARIA_CHANNEL.channelId);
 }
});
test('channel import and similar-video algorithm reject spoofing and duplicates',()=>{
 const first=MARIA_VIDEO_DATABASE.videos[0];
 assert.equal(validateMariaVideo({...first,sourceUrl:'https://youtube.com.evil.test/watch?v='+first.videoId}),false);
 assert.equal(validateMariaVideo({...first,channelId:'wrong'}),false);
 assert.equal(validateMariaVideo({...first,title:'<script>x</script>'}),false);
 assert.equal(validateMariaVideo({...first,videoId:'invalid'}),false);
 assert.equal(searchMariaVideos('nonexistent-273482').length,0);
 const similar=similarMariaVideos('_LcTKx4QSWw');
 assert.equal(similar.length,2);
 assert.ok(similar.every(v=>v.videoId!=='_LcTKx4QSWw'));
 assert.equal(new Set(similar.map(v=>v.videoId)).size,2);
});
test('creator and each verified episode are real Oracle Media source cards, not daycare or ad claims',()=>{
 assert.equal(MARIA_SOURCES.length,4);
 for(const card of MARIA_SOURCES){
  assert.equal(findSourceCard(card.id)?.id,card.id);
  assert.equal(isPublicSourceCard(card),true);
  assert.equal(validSourceCard(card),true);
  assert.equal(departmentFor(card),'media');
  assert.ok(ALL_FEED_CARDS.some(x=>x.id===card.id));
  assert.notEqual(card.contentBoundary,'family-education');
  assert.notEqual(card.contentBoundary,'advertising');
 }
});
test('shared renderer keeps one click-to-play iframe, accessible carousel and complete channel fallback',()=>{
 const source=readFileSync(new URL('../youtube-creator-cards.mjs',import.meta.url),'utf8');
 assert.match(source,/MARIA_CHANNEL/);
 assert.match(source,/View similar/);
 assert.match(source,/View all channel videos/);
 assert.match(source,/www\\.youtube-nocookie\\.com\\/embed\\//);
 assert.match(source,/Stop playback/);
 assert.doesNotMatch(source,/autoplay=1/);
});
