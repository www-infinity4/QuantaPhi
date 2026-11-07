import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{parseGoogleTrendRss,workOrdersForRun,runKey} from '../workers/trend-card-engine/worker.mjs';
const xml=`<?xml version="1.0"?><rss xmlns:ht="https://trends.google.com/trending/rss"><channel>
 <item><title>Pink Floyd &amp; Animals 50</title><link>https://trends.google.com/trending/rss?geo=US</link><ht:approx_traffic>20K+</ht:approx_traffic><pubDate>Sat, 07 Nov 2026 00:00:00 GMT</pubDate></item>
 <item><title>Invalid spoof</title><link>https://not-google.example/</link></item>
 </channel></rss>`;
test('official Google Trends RSS parser retains provenance and blocks lookalikes',()=>{
 const rows=parseGoogleTrendRss(xml,'2026-11-07T06:00:00Z');
 assert.equal(rows.length,1);
 assert.equal(rows[0].query,'Pink Floyd & Animals 50');
 assert.equal(rows[0].approx_searches,'20K+');
 assert.match(rows[0].source_url,/trends\.google\.com/);
 assert.deepEqual(parseGoogleTrendRss('', '2026-11-07T06:00:00Z'),[]);
});
test('eight durable work orders, with dependencies and no false running flags',()=>{
 const run=runKey('2026-11-07T06:00:00Z');
 const orders=workOrdersForRun(run);
 assert.equal(orders.length,8);
 assert.deepEqual(orders.map(o=>o.role),['gpt','yellow','orange','blue','green','red','purple','silver']);
 assert.ok(orders.every(o=>o.state==='queued'&&o.lease_owner===null));
 assert.equal(orders.find(o=>o.role==='blue').depends_on,'orange');
 assert.equal(orders.find(o=>o.role==='silver').depends_on,'red');
 assert.equal(orders.find(o=>o.role==='purple').depends_on,null);
});
test('health reports unwired rather than claiming live bots; approvals fail closed',async()=>{
 const health=await worker.fetch(new Request('https://example.com/health'),{});
 assert.equal(health.status,200);
 assert.deepEqual((await health.json()).active_bots,0);
 const featured=await worker.fetch(new Request('https://example.com/featured'),{});
 assert.equal(featured.status,503);
 const approve=await worker.fetch(new Request('https://example.com/orange/approve',{method:'POST'}),{});
 assert.equal(approve.status,503);
 await assert.rejects(worker.scheduled({},{}),/TREND_DB/i);
});
