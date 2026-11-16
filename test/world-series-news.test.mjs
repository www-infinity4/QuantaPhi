import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validSeriesSnapshot,mountWorldSeriesNews} from '../world-series-news.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const code=read('world-series-news.mjs'),styles=read('world-series-news.css');
const home=read('index.html'),detail=read('trending-now.html'),workflow=read('.github/workflows/world-series-rss-sync.yml');

function sample(extra={}){
 return {schema_version:1,topic:'2026 World Series',checked_at:new Date().toISOString(),
  articles:[{title:'World Series Game 2 analysis after Brewers edge Rays',
   url:'https://www.mlb.com/news/game-2-world-series-2026',publisher:'MLB.com',
   kind:'Analysis',published_at:new Date().toISOString(),summary:'Verified attributed snippet',...extra}]};
}
test('reject stale, absent, forged, and future feed snapshots',()=>{
 assert.equal(validSeriesSnapshot(sample()),true);
 assert.equal(validSeriesSnapshot({...sample(),schema_version:2}),false);
 assert.equal(validSeriesSnapshot({...sample(),articles:[]}),false);
 assert.equal(validSeriesSnapshot({...sample(),checked_at:'2099-01-01T00:00:00Z'}),false);
 assert.equal(validSeriesSnapshot(sample({url:'https://attacker.example/news'})),false);
 assert.equal(validSeriesSnapshot(sample({publisher:'Unknown publisher'})),false);
});

test('show World Series publisher articles with feed-supplied photography, dates and usable controls',()=>{
 assert.match(code,/const IMAGE_HOSTS=/);
 assert.match(code,/function storyNode\(/);
 assert.match(code,/allowedImage\(article\.image_url\)/);
 assert.match(code,/img\.addEventListener\('error'/);
 assert.match(code,/article\.publisher/);
 assert.match(code,/new Date\(article\.published_at\)\.toLocaleString/);
 assert.match(code,/Read the original report/);
 assert.match(code,/mountCardActions\(actions,/);
 assert.match(code,/world-series-.+\.toString\(36\)/);
 assert.match(code,/card=mlb&story=/);
 assert.match(code,/No verified World Series RSS not available|Verified World Series RSS not available/);
 assert.doesNotMatch(code,/innerHTML\s*=/);
 assert.match(styles,/\.ws-news-photo/);
 assert.match(styles,/min-height:44px/);
});

test('archived World Series reporter is no longer loaded in cards or scheduled daily',()=>{
 for(const html of [home,detail]){
  assert.match(html,/id="googleTrendMlb"/);
  assert.doesNotMatch(html,/world-series-news\.mjs|world-series-news\.css|World Series/);
 }
 assert.doesNotMatch(workflow,/cron:/);
 assert.match(workflow,/workflow_dispatch/);
 assert.match(code,/last checked /);
});
test('the retired Cardone research page no longer ships',()=>{
 assert.doesNotMatch(read('sitemap.xml'),/cardone-capital/i);
});
