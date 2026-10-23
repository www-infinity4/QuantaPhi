import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {trafficAPI} from '../workers/quantaphi-site/traffic-api.mjs';
const url='https://quantaphi.org/api/site-traffic';
const env={CLOUDFLARE_ANALYTICS_TOKEN:'test-only-read-token'};
test('live traffic endpoint securely serves verified seven-day requests and page views',async()=>{
 const date=new Date(),today=new Date(date.toISOString().slice(0,10)+'T00:00:00Z');
 const yesterday=new Date(today.getTime()-86400000).toISOString().slice(0,10);
 let calls=0;
 const res=await trafficAPI(new Request(url),env,async(to,options)=>{
  calls++;
  assert.equal(to,'https://api.cloudflare.com/client/v4/graphql');
  assert.equal(options.headers.Authorization,'Bearer test-only-read-token');
  const payload=JSON.parse(options.body);
  assert.equal(payload.variables.zoneTag,'b1b4ce8b8ab433ec879238fc4a83a493');
  assert.match(payload.query,/httpRequests1dGroups/);
  return Response.json({data:{viewer:{zones:[{days:[{dimensions:{date:yesterday},sum:{requests:335,pageViews:49}}]}]}}});
 },null);
 assert.equal(calls,1);
 assert.equal(res.status,200);
 const data=await res.json();
 assert.equal(data.requests,335);
 assert.equal(data.pageViews,49);
 assert.equal(data.days.length,7);
 assert.equal(data.source,'Cloudflare GraphQL httpRequests1dGroups');
 assert.doesNotMatch(JSON.stringify(data),/test-only-read-token/);
 assert.match(res.headers.get('Cache-Control'),/s-maxage=600/);
});
test('no credential fails closed, never displaying a fabricated total',async()=>{
 const res=await trafficAPI(new Request(url),{},()=>{throw Error('must not fetch');},null);
 assert.equal(res.status,503);
 assert.equal((await res.json()).ok,false);
});
test('Cloudflare GraphQL errors are not exposed to visitors',async()=>{
 const res=await trafficAPI(new Request(url),env,async()=>Response.json({errors:[{message:'secret server diagnostic'}]}),null);
 assert.equal(res.status,503);
 assert.doesNotMatch(await res.text(),/secret server diagnostic/);
});
test('API prevents methods other than public GET',async()=>{
 const res=await trafficAPI(new Request(url,{method:'POST'}),env,()=>{throw Error('must not fetch');},null);
 assert.equal(res.status,405);
});
test('homepage keeps accurate dynamic Cloudflare page-view labels',()=>{
 const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const client=readFileSync(new URL('../site-traffic.js',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../workers/quantaphi-site/worker.js',import.meta.url),'utf8');
 assert.match(home,/id="qtrafficViews"/);
 assert.match(home,/site-traffic\.js/);
 assert.match(client,/\/api\/site-traffic/);
 assert.match(worker,/trafficAPI\(request,env\)/);
});
