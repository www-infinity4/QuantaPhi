'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');
const js=read('google-trending-cards.js'),page=read('trending-now.html'),
 home=read('index.html'),css=read('google-trending-cards.css'),deck=read('oracle-card-deck.js');
const research=JSON.parse(read('research/google-trends/2026-10-23-us.json'));
test('Google source inspection is saved as research history with dated evidence',()=>{
 assert.equal(research.source_url,'https://trends.google.com/trending?geo=US&hours=24');
 assert.equal(research.date_us_central,'2026-10-23');
 assert.ok(research.topics.length>=5);
 assert.ok(research.topics.some(t=>t.query==='knicks vs celtics'));
 assert.ok(research.topics.some(t=>t.query==='rays vs brewers'));
 assert.ok(research.limitations.length>=3);
});
test('three dedicated original website cards mount on homepage and full-page explorer',()=>{
 for(const id of ['googleTrendNba','googleTrendMlb','googleTrendCulture']){
  assert.match(home,new RegExp('id="'+id+'"'));
  assert.match(page,new RegExp('id="'+id+'"'));
  assert.match(deck,new RegExp("'"+id+"'"));
  assert.match(css,new RegExp('#'+id+'|\\.gt-card'));
 }
 assert.match(page,/source: Google Trends|Google Trends/);
 assert.match(home,/\/trending-now\.html/);
 assert.match(read('sitemap.xml'),/trending-now\.html/);
 assert.match(home,/google-trending-cards\.js\?v=20261023-trendsync2/);
 assert.match(home,/google-trending-cards\.css\?v=20261023-trendsync2/);
});
test('only sourced sport states are displayed; status does not fabricate games',()=>{
 assert.doesNotThrow(()=>new Function(js));
 assert.match(js,/site\.api\.espn\.com\/apis\/site\/v2\/sports\/basketball\/nba\/scoreboard/);
 assert.match(js,/statsapi\.mlb\.com\/api\/v1\/schedule/);
 assert.match(js,/if\(!response\.ok\)throw/);
 assert.match(js,/refresh failed/);
 assert.match(js,/AbortError/);
 assert.match(js,/source checked/);
 assert.match(js,/World Series/);
 assert.match(js,/Date\(isoDay\(day\)/);
});
test('media cards direct to publishers; search counts stay a dated snapshot',()=>{
 assert.match(js,/new Intl\.DateTimeFormat/);
 assert.match(js,/October 23, 2026/);
 assert.match(js,/Google Trends/);
 assert.match(js,/news\.google\.com\/search/);
 assert.match(js,/youtube\.com\/results/);
 assert.doesNotMatch(js,/innerHTML\s*=/);
 assert.doesNotMatch(js,/sk_live_|creditCardNumber|accountNumber/);
 assert.match(page,/not a live viewer counter/);
 assert.match(page,/does not rehost proprietary article bodies|does not rehost proprietary/);
});
test('trending cards participate in the existing QuantaPhi interaction ledger',()=>{
 const trends=read('public-card-trends.js');
 for(const id of ['google-trend-nba','google-trend-mlb','google-trend-media'])assert.ok(trends.includes(id));
 assert.match(deck,/data-oracle-spotlight/);
 assert.match(deck,/stage\.append\(entry\.node\)/);
});

test('trending feed has real scheduled ingestion, source-freshness handling and historical backup',()=>{
 const wf=read('.github/workflows/google-trends-sync.yml');
 const importer=read('scripts/sync_google_trends.py');
 assert.match(wf,/cron:.*\\*\\/30/);
 assert.match(wf,/sync_google_trends\\.py/);
 assert.match(importer,/trends\\.google\\.com\\/trending\\/rss\\?geo=US/);
 assert.match(js,/google-trends-latest\\.json/);
 assert.match(js,/stale/);
 assert.match(js,/last checked/);
 assert.match(js,/setInterval/);
 assert.match(page,/RSS importer/);
});
