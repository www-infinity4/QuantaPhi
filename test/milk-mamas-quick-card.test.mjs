import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MILK_MAMAS_CHANNEL,MILK_MAMAS_EPISODES,MILK_MAMAS_SOURCE} from '../milk-mamas-catalog.mjs';
import {ACTIVE_SOURCE_CARDS,PUBLIC_SOURCE_IDS,validSourceCard,findSourceCard} from '../source-quick-cards.mjs';

test('seven distinct source-identified Milk Mamas Nest videos with canonical YouTube URLs',()=>{
 assert.equal(MILK_MAMAS_CHANNEL.url,'https://www.youtube.com/@MilkMamasNest3');
 assert.equal(MILK_MAMAS_EPISODES.length,7);
 assert.equal(new Set(MILK_MAMAS_EPISODES.map(v=>v.videoId)).size,7);
 assert.equal(MILK_MAMAS_EPISODES[0].videoId,'Hft1qIEnuuY');
 for(const v of MILK_MAMAS_EPISODES){
  assert.match(v.videoId,/^[A-Za-z0-9_-]{11}$/);
  assert.equal(v.sourceUrl,'https://www.youtube.com/watch?v='+v.videoId);
  assert.equal(v.publisher,'Milk Mamas Nest');
  assert.equal(v.publisherUrl,MILK_MAMAS_CHANNEL.url);
  assert.equal(v.publishedAt,null);
  assert.equal(v.contentBoundary,'family-education');
  assert.match(v.thumbnail,/^https:\/\/i\.ytimg\.com\/vi\//);
  assert.ok(v.title.length>1);
 }
});
test('separate public source card stays within family education and source attribution',()=>{
 assert.equal(MILK_MAMAS_SOURCE.id,'milk-mamas-nest');
 assert.equal(MILK_MAMAS_SOURCE.official,MILK_MAMAS_CHANNEL.url);
 assert.equal(MILK_MAMAS_SOURCE.contentBoundary,'family-education');
 assert.equal(MILK_MAMAS_SOURCE.kind,'Video · Family education');
 assert.ok(PUBLIC_SOURCE_IDS.includes(MILK_MAMAS_SOURCE.id));
 assert.ok(ACTIVE_SOURCE_CARDS.some(c=>c.id===MILK_MAMAS_SOURCE.id));
 assert.ok(validSourceCard(findSourceCard(MILK_MAMAS_SOURCE.id)));
 assert.doesNotMatch(MILK_MAMAS_SOURCE.feature,/advert|adult|21\+|sponsored/i);
});
test('existing one-player Quick Card engine adds episode pagination and original channel fallback',()=>{
 const ui=readFileSync(new URL('../family-parenting-tv-card.mjs',import.meta.url),'utf8');
 const wiring=readFileSync(new URL('../quanta-card-experience.mjs',import.meta.url),'utf8');
 assert.match(ui,/MILK_MAMAS_EPISODES/);
 assert.match(ui,/MILK_MAMAS_SOURCE/);
 assert.match(ui,/Previous episode/);
 assert.match(ui,/Next episode/);
 assert.match(ui,/All channel videos/);
 assert.match(ui,/www\.youtube-nocookie\.com\/embed\//);
 assert.match(ui,/Stop playback/);
 assert.match(wiring,/mountFamilyParentingTvCard\(root,card\)/);
});
