'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');
test('native X card mounts in QuantaPhi and preserves separate Spaces card',()=>{
 const host=read('bubbles-card-host.mjs');assert.ok(host.includes("script.type='module'"),'Bubbles host must load registered mjs cards');
 const home=read('index.html'),card=read('x-twitter-card.mjs'),css=read('x-twitter-card.css'),page=read('twitter.html');
 assert.ok(page.includes('id="xTwitterCard"'));
 assert.ok(page.includes('cloud-wallet-client.js'));
 assert.ok(page.includes('x-twitter-card.mjs'));
 assert.ok(!page.includes('window.location.replace'))
 assert.ok(home.includes('id="xTwitterCard"'),'original X widget must exist for Oracle to move');
 assert.ok(home.includes('/x-twitter-card.mjs'),'real X controller must be loaded on homepage');
 assert.ok(home.includes('/x-twitter-card.css'));
 const deck=read('oracle-card-deck.js');
 assert.ok(deck.includes("['xTwitterCard','X · Twitter Quick Card']"),'X must be registered as a native Oracle carousel choice');
 assert.ok(deck.includes("xTwitterCard:['x-twitter'"),'X should have its own Public / For You / Following routing key');
 assert.ok(deck.includes("twitter:'xTwitterCard'"),'deep link must select the real X slide');
 assert.ok(page.includes('id="xTwitterCard"'),'old bookmark stays usable, but is no longer the only entry'); assert.ok(home.includes('id="xSpacesQuickCard"'));
 for(const name of ['Public','Following','Live Spaces','Profile','Compose','Reply','Like'])assert.ok(card.includes(name),name);
 assert.ok(card.includes('textContent'),'untrusted post text must be escaped');
 assert.ok(card.includes('/v1/x/timeline'));
 assert.ok(card.includes('/v1/x/spaces/live'));
 assert.ok(card.includes('/v1/x/post'));
 assert.ok(card.includes('/v1/x/like'));
 assert.ok(card.includes('/connect-x'),'single consistent X authorization location');
 assert.ok(css.includes('min-width:0'));
 assert.ok(css.includes('overflow-wrap:anywhere'));
 assert.ok(!card.includes('fakePosts'));
});
test('native X backend verifies scope, uses source data, and does not replay ended Spaces as live',()=>{
 const worker=read('workers/media-star-following/worker.js');
 for(const endpoint of ['/v1/x/timeline','/v1/x/spaces/live','/v1/x/profile','/v1/x/post','/v1/x/like'])assert.ok(worker.includes(endpoint),endpoint);
 assert.ok(worker.includes('x_write_permission_required'));
 assert.ok(worker.includes("space.state==='live'"),'live cards must filter out ended Spaces');
 assert.ok(worker.includes("tweet.write"));
 assert.ok(worker.includes("like.write"));
 assert.ok(worker.includes('x_api_verified'));
 assert.ok(!worker.includes('fakeTimeline'));
});

test('X post reader accepts genuine status URLs and IDs, rejects unrelated and invalid links',async()=>{
 const {parseXPostId}=await import('../x-twitter-card.mjs');
 for(const value of ['1888777666555444333','https://x.com/SomeUser/status/1888777666555444333','https://twitter.com/SomeUser/status/1888777666555444333?s=20'])
  assert.equal(parseXPostId(value),'1888777666555444333');
 for(const invalid of ['https://evil.example/SomeUser/status/1888777666555444333','https://x.com/i/spaces/1888777666555444333','https://x.com/SomeUser/status/abc','https://x.com/SomeUser/status/1888777666555444333/extra',''])assert.equal(parseXPostId(invalid),null);
 const card=read('x-twitter-card.mjs');
 assert.ok(card.includes('/v1/x/post?id='));
 assert.ok(card.includes('Read this post'));
 assert.ok(card.includes('One post'));
});
