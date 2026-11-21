import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectTrendMovieCards,validateMovieSnapshot,movieCardId} from '../trending-movie-core.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const now='2026-11-07T02:20:00Z';
const movie={id:'Qwerty12345',title:'Godzilla Minus Zero',video_id:'Qwerty12345',video_title:'Godzilla Minus Zero Trailer #2 (2026)',kind:'trailer',publisher:'Rotten Tomatoes Trailers',published_at:'2026-11-06T12:00:00Z',poster:'https://i.ytimg.com/vi/Qwerty12345/hqdefault.jpg',source_url:'https://www.youtube.com/watch?v=Qwerty12345',trend_query:'godzilla minus zero',trend_checked_at:now,trend_published_at:now,approx_searches:'20K+',google_trending:true};
const valid={schema_version:1,source:'Google Trends RSS + publisher trailer RSS',source_url:'https://trends.google.com/trending/rss?geo=US',checked_at:now,items:[movie]};

test('fresh matching Google Trends trailer becomes exactly one card, with actual playable ID',()=>{
 assert.equal(movieCardId(movie.video_id),'trendMovieQwerty12345');
 const rows=selectTrendMovieCards(valid,Date.parse(now));
 assert.equal(rows.length,1);
 assert.equal(rows[0].google_trending,true);
 assert.equal(rows[0].video_id,movie.video_id);
});
test('stale, impersonated, non-movie and unsafe media never populate live cards',()=>{
 for(const change of [
 {video_id:'bad'}, {poster:'javascript:alert(1)'},{title:'News highlights'},
 {source_url:'https://evil.example/123'},{kind:'full-film'},
 {google_trending:true,trend_query:''}
 ]){
  const rows=selectTrendMovieCards({...valid,items:[{...movie,...change}]},Date.parse(now));
  assert.equal(rows.length,0,JSON.stringify(change));
 }
 assert.deepEqual(selectTrendMovieCards({...valid,checked_at:'2026-10-01T00:00:00Z'},Date.parse(now)),[]);
 assert.equal(validateMovieSnapshot({...valid,source_url:'https://fake.example/'},Date.parse(now)),false);
});
test('dedupe entries and cap carousel even with valid metadata',()=>{
 const entries=Array.from({length:35},(_,i)=>({...movie,id:'ABCD'+String(i).padStart(7,'0'),video_id:'ABCD'+String(i).padStart(7,'0'),source_url:'https://www.youtube.com/watch?v=ABCD'+String(i).padStart(7,'0'),poster:'https://i.ytimg.com/vi/ABCD'+String(i).padStart(7,'0')+'/hqdefault.jpg'}));
 assert.equal(selectTrendMovieCards({...valid,items:[movie,movie,...entries]},Date.parse(now)).length,12);
});
test('each trend movie is a native independent Oracle card with in-place stop and play',()=>{
 const ui=read('trending-movie-quick-cards.mjs'),deck=read('oracle-card-deck.js'),home=read('index.html');
 assert.match(ui,/youtube-nocookie\.com\/embed\//);
 assert.match(ui,/quantaphi:tv-playback-request/);
 assert.match(ui,/oracle:card-deactivated/);
 assert.match(ui,/playsinline/);
 assert.match(ui,/pagehide/);
 assert.match(ui,/setInterval/);
 assert.match(ui,/MOVIE_FEED_BACKUP/);
 assert.match(read('trending-movie-core.mjs'),/trends-rss-data\/data\/trending-movies-latest\.json/);
 assert.doesNotMatch(ui,/window\.open|target\s*=\s*['"]_blank/);
 assert.match(deck,/registerTrendingMovieCards/);
 assert.match(deck,/trendingMovieCards/);
 assert.match(home,/id="trendingMovieCards"/);
 assert.match(home,/trending-movie-quick-cards\.mjs/);
 assert.match(read('trending-movie-quick-cards.css'),/aspect-ratio:\s*16\s*\/\s*9/);
});
test('scheduled importer uses verified Google RSS, actual trailer publisher feeds, and no fake fill',()=>{
 const sync=read('scripts/sync_trending_movies.py'),workflow=read('.github/workflows/trending-movies-sync.yml');
 assert.match(workflow,/google-trends-latest\.json/);
 assert.match(sync,/youtube\.com\/feeds\/videos\.xml/);
 assert.match(sync,/trend_query/);
 assert.match(sync,/no Google match|new trailer/i);
 assert.match(workflow,/trends-rss-data/);
 assert.match(workflow,/cron:/);
 assert.doesNotMatch(sync,/random\.choice|fake.*movie|invented.*trend/i);
});
