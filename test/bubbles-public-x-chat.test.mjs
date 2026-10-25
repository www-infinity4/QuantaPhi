import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker,{chooseTool} from '../workers/bubbles-tools/worker.mjs';
const req=q=>new Request('https://tools/v1/assist',{method:'POST',headers:{Origin:'https://quantaphi.org'},body:JSON.stringify({request:q,mcp:true})});
test('Twitter reads route to Cloudflare reader before the generic page reader or model',async()=>{
 for(const q of ['Read my Twitter posts','Can you see my tweets?','Read https://x.com/YahooPingcwlz'])assert.equal(chooseTool(q),'public_x.read');
 let calls=0;
 const env={PUBLIC_X:{fetch:async r=>{calls++;assert.equal(r.method,'GET');return Response.json(r.url.endsWith('/health')?{ok:true,profile:'https://x.com/YahooPingcwlz',readStatus:{status:'blocked',last_success:'2026-10-24T19:50:02Z'}}:{ok:true,author:'YahooPingcwlz',items:[{id:'2113352129427730641',url:'https://x.com/YahooPingcwlz/status/2113352129427730641',body:'Build a card #bubbles',observed_at:'2026-10-24T19:50:02Z'}]});}},AI:{run:()=>assert.fail('real read must not become a model denial')}};
 const b=await(await worker.fetch(req('Read my Twitter posts'),env)).json();
 assert.equal(calls,2);assert.equal(b.receipt.tool,'public_x.read');assert.equal(b.receipt.status,'partial');
 assert.match(b.output,/previously saved/);assert.match(b.output,/Build a card/);assert.equal(b.receipt.executed,false);
 assert.equal(b.receipt.completeHistory,false);assert.equal(b.receipt.freshScanTriggered,false);
});
test('reader missing or failed never claims access or a successful scan',async()=>{
 for(const env of [{},{PUBLIC_X:{fetch:async()=>{throw Error('down')}}}]){
 const b=await(await worker.fetch(req('Read my tweets'),env)).json();
 assert.equal(b.ok,false);assert.notEqual(b.receipt.status,'complete');
 }
});
test('successful scan is distinguished from blocked and foreign post links are discarded',async()=>{
 const env={PUBLIC_X:{fetch:async r=>Response.json(r.url.endsWith('/health')?{ok:true,profile:'https://x.com/YahooPingcwlz',readStatus:{status:'public_posts_observed'}}:{ok:true,author:'YahooPingcwlz',items:[{id:'2113352129427730641',url:'https://evil.example',body:'wrong'}]})}};
 const b=await(await worker.fetch(req('Show my latest tweets'),env)).json();
 assert.equal(b.receipt.status,'complete');assert.equal(b.items.length,0);assert.equal(b.receipt.cached,true);
});
