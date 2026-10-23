import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {trafficAPI} from '../workers/quantaphi-site/traffic-api.mjs';

const url='https://quantaphi.org/api/site-traffic';
const env={CLOUDFLARE_ANALYTICS_TOKEN:'test-only-read-token'};
test('live traffic endpoint uses scoped server-only Cloudflare GraphQL data',async()=>{
 let calls=0;
 const res=await trafficAPI(new Request(url),env,async (to,options)=>{
  calls++;
  assert.equal(to,'https://api.cloudflare.com/client/v4/graphql');
  assert.equal(options.headers.Authorization,'Bearer test-only-read-token');
  const payload=JSON.parse(options.body);
  assert.equal(payload.variables.zoneTag,'b1b4ce8b8ab433ec879238fc4a83a493');
  assert.match(payload.query,/httpRequestsAdaptiveGroups/);
  assert.match(payload.query,/requestSource: "eyeball"/);
  return Response.json({data:{viewer:{zones:[{totals:[{count:335,sum:{visits:49}}]}]}}});
 },null);
 assert.equal(calls,1);
 assert.equal(res.status,200);
 const data=await res.json();
 assert.equal(data.requests,335);
 assert.equal(data.visits,49);
 assert.equal(data.period,'rolling_24h');
 assert.doesNotMatch(JSON.stringify(data),/test-only-read-token/);
 assert.match(res.headers.get('Cache-Control'),/s-maxage=600/);
});
test('missing credential fails closed instead of showing the old snapshot',async()=>{
 const res=await trafficAPI(new Request(url),{},()=>{throw Error('must not fetch');},null);
 assert.equal(res.status,503);
 assert.equal((await res.json()).ok,false);
});
test('API failures are not exposed to visitors',async()=>{
 const res=await trafficAPI(new Request(url),env,async()=>Response.json({errors:[{message:'secret server diagnostic'}]}),null);
 assert.equal(res.status,503);
 assert.doesNotMatch(await res.text(),/secret server diagnostic/);
});
test('only public GET is accepted',async()=>{
 const res=await trafficAPI(new Request(url,{method:'POST'}),env,()=>{throw Error('must not fetch');},null);
 assert.equal(res.status,405);
});
test('QuantaPhi homepage has live labels and no static 2026-10-13 counter',()=>{
 const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../workers/quantaphi-site/worker.js',import.meta.url),'utf8');
 assert.match(home,/id="qtrafficVisits"/);
 assert.match(home,/traffic-counter\.js/);
 assert.doesNotMatch(home,/273,731|87,324|Cloudflare snapshot from October 13/);
 assert.match(worker,/trafficAPI\(request,env\)/);
});
