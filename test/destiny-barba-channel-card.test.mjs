import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DESTINY_BARBA_CHANNEL,DESTINY_BARBA_VIDEOS,DESTINY_BARBA_SOURCE,validateDestinyBarbaVideo} from '../destiny-barba-channel-card.mjs';
import {ACTIVE_SOURCE_CARDS,findSourceCard,validSourceCard,isPublicSourceCard} from '../source-quick-cards.mjs';
import {ALL_FEED_CARDS} from '../quanta-feed.mjs';
import {departmentFor} from '../quanta-context-placement.mjs';

test('Destiny Barba channel is anchored to the verified publisher and YouTube-hosted uploads playlist',()=>{
 assert.equal(DESTINY_BARBA_CHANNEL.channelId,'UCIQHAxjqVnwHwOKtILiWI0Q');
 assert.equal(DESTINY_BARBA_CHANNEL.profileUrl,'https://www.youtube.com/@DestinyBarba');
 assert.equal(DESTINY_BARBA_CHANNEL.uploadsPlaylistId,'UUIQHAxjqVnwHwOKtILiWI0Q');
 assert.equal(DESTINY_BARBA_CHANNEL.uploadsPlaylistUrl,'https://www.youtube.com/playlist?list=UUIQHAxjqVnwHwOKtILiWI0Q');
 assert.equal(DESTINY_BARBA_CHANNEL.archiveIndexed,false,'Do not mislabel a YouTube-hosted full uploads playlist as a QuantaPhi indexed archive');
 assert.equal(DESTINY_BARBA_VIDEOS.length,2);
 assert.equal(new Set(DESTINY_BARBA_VIDEOS.map(v=>v.videoId)).size,2);
 assert.equal(DESTINY_BARBA_VIDEOS[0].videoId,'KTDIFJJB8-4');
 for(const v of DESTINY_BARBA_VIDEOS){
  assert.ok(validateDestinyBarbaVideo(v),v.videoId);
  assert.equal(v.sourceUrl,'https://www.youtube.com/watch?v='+v.videoId);
  assert.equal(v.publishedAt,null);
 }
 assert.equal(validateDestinyBarbaVideo({...DESTINY_BARBA_VIDEOS[0],sourceUrl:'https://youtube.com.bad.test/watch?v=KTDIFJJB8-4'}),false);
 assert.equal(validateDestinyBarbaVideo({...DESTINY_BARBA_VIDEOS[0],title:'<script>alert(1)</script>'}),false);
});

test('Destiny Barba channel Quick Card joins the public Oracle media carousel without duplicating Abbe',()=>{
 assert.ok(validSourceCard(DESTINY_BARBA_SOURCE));
 assert.ok(isPublicSourceCard(DESTINY_BARBA_SOURCE));
 assert.equal(findSourceCard('destiny-barba-youtube'),DESTINY_BARBA_SOURCE);
 assert.ok(ACTIVE_SOURCE_CARDS.includes(DESTINY_BARBA_SOURCE));
 assert.ok(ALL_FEED_CARDS.some(c=>c.id==='destiny-barba-youtube'));
 assert.equal(departmentFor(DESTINY_BARBA_SOURCE),'media');
});

test('Destiny player uses one opt-in original-provider iframe; stop and official channel fallback remain visible',()=>{
 const src=readFileSync(new URL('../destiny-barba-channel-card.mjs',import.meta.url),'utf8');
 const tools=readFileSync(new URL('../quanta-card-experience.mjs',import.meta.url),'utf8');
 assert.match(tools,/mountDestinyBarbaChannelCard\(root,card\)/);
 assert.match(src,/youtube-nocookie\.com\/embed\/videoseries\?list=/);
 assert.match(src,/Browse all channel uploads in card/);
 assert.match(src,/Stop playback/);
 assert.match(src,/Load more on YouTube/);
 assert.match(src,/minHeight='44px'/);
 assert.doesNotMatch(src,/autoplay=1|document\.cookie|localStorage|fetch\(/);
});
