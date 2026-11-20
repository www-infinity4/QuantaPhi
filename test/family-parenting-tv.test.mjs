import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FAMILY_TV_SOURCE,FAMILY_TV_API_URL,normalizeFamilyEpisode,parseFamilyEpisodes} from '../family-parenting-tv-core.mjs';
import {handleFamilyTvRequest} from '../workers/family-parenting-tv/worker.mjs';
import {ACTIVE_SOURCE_CARDS,PUBLIC_SOURCE_IDS,findSourceCard,validSourceCard} from '../source-quick-cards.mjs';

const row={video_id:'5Ox2EPCwt4s',channel_key:'family-parenting-tv',title:'National Child Care Compensation Data',
 publisher:'Child Care Aware® of America',publisher_url:'https://www.youtube.com/@CCAofAmerica',
 source_url:'https://www.youtube.com/watch?v=5Ox2EPCwt4s',topic:'provider-training',
 observed_at:'2026-11-20',published_at:null,content_boundary:'family-education'};
test('D1 video records use exact verified publishers, YouTube IDs and strictly nonsexual family category',()=>{
 const normalized=normalizeFamilyEpisode(row);
 assert.equal(normalized.videoId,'5Ox2EPCwt4s');
 assert.equal(normalized.sourceUrl,row.source_url);
 for(const fake of [
  {...row,source_url:'https://www.youtube.com@fake.test/watch?v=5Ox2EPCwt4s'},
  {...row,source_url:'https://www.youtube.com/watch?v=BADBADBAD00'},
  {...row,content_boundary:'adult'},
  {...row,topic:'adult'},
  {...row,publisher:'Unverified channel'},
  {...row,title:'<iframe>'}
 ]) assert.equal(normalizeFamilyEpisode(fake),null);
});
test('family catalog deduplicates and cannot be routed to adult placements',()=>{
 const list=parseFamilyEpisodes([row,row,{...row,video_id:'z1234567890',source_url:'https://www.youtube.com/watch?v=z1234567890'}]);
 assert.equal(list.length,2);
 assert.equal(list[0].contentBoundary,'family-education');
 assert.equal(FAMILY_TV_SOURCE.id,'family-parenting-tv');
 assert.match(FAMILY_TV_SOURCE.kind,/Family education/i);
 assert.ok(!/adult|21\+|porn/i.test([FAMILY_TV_SOURCE.kind,FAMILY_TV_SOURCE.feature].join(' ')));
 assert.ok(validSourceCard(FAMILY_TV_SOURCE));
 assert.ok(PUBLIC_SOURCE_IDS.includes(FAMILY_TV_SOURCE.id));
 assert.ok(ACTIVE_SOURCE_CARDS.some(c=>c.id===FAMILY_TV_SOURCE.id));
 assert.equal(findSourceCard(FAMILY_TV_SOURCE.id).id,FAMILY_TV_SOURCE.id);
 assert.equal(FAMILY_TV_API_URL,'https://quantaphi-family-parenting-tv.marvaseater.workers.dev/episodes');
});
test('read-only Worker returns only family records, CORS-scopes QuantaPhi and denies writes',async()=>{
 let calls=0;
 const env={CATALOG:{prepare(sql){
   assert.match(sql,/content_boundary\s*=\s*'family-education'/);
   return {all:async()=>{calls++;return {results:[row]};}};
 }}};
 const res=await handleFamilyTvRequest(new Request(FAMILY_TV_API_URL,{headers:{origin:'https://quantaphi.org'}}),env);
 assert.equal(res.status,200);
 assert.equal(res.headers.get('access-control-allow-origin'),'https://quantaphi.org');
 assert.equal((await res.json()).videos.length,1);
 const bad=await handleFamilyTvRequest(new Request(FAMILY_TV_API_URL,{method:'POST'}),env);
 assert.equal(bad.status,405);
 const origin=await handleFamilyTvRequest(new Request(FAMILY_TV_API_URL,{headers:{origin:'https://attacker.test'}}),env);
 assert.equal(origin.headers.get('access-control-allow-origin'),null);
 assert.equal(calls,2);
});
test('existing Oracle source Quick Cards render a standalone channel with opt-in playback and no paywall',()=>{
 const ui=readFileSync(new URL('../family-parenting-tv-card.mjs',import.meta.url),'utf8');
 const wiring=readFileSync(new URL('../quanta-card-experience.mjs',import.meta.url),'utf8');
 assert.match(wiring,/mountFamilyParentingTvCard\(root,card\)/);
 assert.match(ui,/www\.youtube-nocookie\.com\/embed\//);
 assert.match(ui,/Read original on YouTube/);
 assert.match(ui,/Stop playback/);
 assert.match(ui,/No 21\+ material/);
 assert.doesNotMatch(ui,/StarCoin|paywall|autoplay=1/);
});
