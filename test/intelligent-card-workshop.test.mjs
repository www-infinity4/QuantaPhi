import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCard,mergeStories,nextStory,placementRequest} from '../card-workshop/model.mjs';
import {planCard,refreshCard} from '../workers/bubbles-tools/intelligent-cards.mjs';
const input={title:'Research',query:'cancer research',kind:'research',sourceUrl:'https://pubmed.ncbi.nlm.nih.gov'};
test('creation and placement have distinct prices and no fabricated paid status',async()=>{
 const result=await planCard({request:'Build a cancer research journal'},{AI:{run:async()=>({response:JSON.stringify(input)})}});
 assert.equal(result.creationFee,0);assert.equal(result.published,false);
 const placement=placementRequest(result.card,'rev_abc');
 assert.equal(placement.amount,1000);assert.equal(placement.currency,'STARCOIN');
 assert.equal(placement.paid,false);assert.equal(placement.published,false);
});
test('unsafe links and unsupported MLB identities fail before source access',()=>{
 assert.throws(()=>normalizeCard({...input,sourceUrl:'javascript:alert(1)'}));
 assert.throws(()=>normalizeCard({...input,kind:'scores',teamId:'not-a-team'}));
 assert.equal(normalizeCard({...input,refreshMinutes:0}).refreshMinutes,15);
});
test('feed deduplicates tracking links, ranks verified dates and consumes unseen stories',()=>{
 const rows=mergeStories([],[{title:'Undated',url:'https://example.org/a',relevance:1},
 {title:'Earlier',url:'https://example.org/b',publishedAt:'2026-10-20'},
 {title:'Newest',url:'https://example.org/c?utm_source=feed',publishedAt:'2026-10-23'},
 {title:'Newest duplicate',url:'https://example.org/c',publishedAt:'2026-10-23'},
 {title:'Unsafe',url:'javascript:alert(1)'}]);
 assert.equal(rows.length,3);assert.equal(rows[0].url,'https://example.org/c');
 assert.equal(nextStory(rows,[rows[0].url]).title,'Earlier');
 assert.equal(nextStory(rows,rows.map(x=>x.url)),null);
});
test('research refresh scopes source results without fetching supplied URLs',async()=>{
 const visited=[];
 const fetcher=async url=>{visited.push(String(url));return new Response(JSON.stringify({results:[
 {title:'Study',url:'https://pubmed.ncbi.nlm.nih.gov/123/',content:'Preliminary study'},
 {title:'Unrelated',url:'https://example.org/elsewhere',content:'Other source'}]}))};
 const result=await refreshCard({card:input},{},fetcher);
 assert.equal(visited.length,1);assert.match(visited[0],/^https:\/\/orange-brook-a2ac/);
 assert.equal(result.items.length,1);assert.equal(result.items[0].publishedAt,null);
 assert.match(result.dateNotice,/not certified newest/);assert.match(result.researchNotice,/limitations/);
});
test('MLB scores come from fixed MLB API and retain source links',async()=>{
 const result=await refreshCard({card:{...input,kind:'scores',teamId:112}},{},async url=>{
 assert.match(url,/^https:\/\/statsapi.mlb.com\/api\/v1\/schedule\?/);assert.match(url,/teamId=112/);
 return new Response(JSON.stringify({dates:[{games:[{gamePk:42,gameDate:'2026-10-23T20:00:00Z',status:{detailedState:'Final'},teams:{away:{team:{name:'Cubs'},score:4},home:{team:{name:'Reds'},score:2}}}]}]}))});
 assert.equal(result.items[0].url,'https://www.mlb.com/gameday/42');assert.match(result.items[0].snippet,/Cubs 4/);
});
import {parseCardNews} from '../workers/bubbles-tools/intelligent-cards.mjs';
import worker from '../workers/bubbles-tools/worker.mjs';
test('news cards preserve dated publisher-scoped RSS stories',()=>{
 const xml='<rss><item><title>Iran &amp; diplomacy</title><link>https://news.google.com/rss/articles/123</link><pubDate>Fri, 23 Oct 2026 12:00:00 GMT</pubDate><source url="https://www.cnn.com">CNN</source></item></rss>';
 const rows=parseCardNews(xml,'cnn.com',Date.parse('2026-10-23T18:00:00Z'));
 assert.equal(rows.length,1);assert.equal(rows[0].title,'Iran & diplomacy');assert.match(rows[0].publishedAt,/2026-10-23/);
 assert.equal(parseCardNews(xml,'example.org').length,0);
});
test('public exported-card refresh preflight grants no credential access',async()=>{
 const r=await worker.fetch(new Request('https://tools.test/v1/cards/refresh',{method:'OPTIONS',headers:{Origin:'https://my-card.example'}}),{});
 assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'*');assert.equal(r.headers.get('Access-Control-Allow-Credentials'),null);
 const plan=await worker.fetch(new Request('https://tools.test/v1/cards/plan',{method:'POST',headers:{Origin:'https://my-card.example'},body:'{}'}),{});
 assert.equal(plan.status,403);
});

import {findCard,cardIntent} from '../bubbles-card-catalog.mjs';
test('Bubbles can open both registered new card surfaces',()=>{
 assert.equal(findCard('card builder').url,'/card-workshop/');
 assert.equal(cardIntent('open starmaker').card.url,'/starmaker-card/');
});
