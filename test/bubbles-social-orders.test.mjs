import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBubblesXPost, discoverBubblesXOrders} from '../workers/infinity-brain-clock/bubbles-social-orders.mjs';
import {readFileSync} from 'node:fs';
const OWNER='123456789012345';
const POST=(text,id='123456789012346',author_id=OWNER)=>({id,author_id,text,created_at:'2026-10-18T17:01:00Z'});

test('only a pinned numeric X author can submit an actionable hashtag candidate',()=>{
  const good=parseBubblesXPost(POST('#bubbles Fix Infinity Radio playback'),OWNER);
  assert.equal(good?.command,'Fix Infinity Radio playback');
  assert.equal(good?.sourceUrl,'https://x.com/i/status/123456789012346');
  assert.equal(good?.approvalRequired,true);
  assert.equal(good?.executionStarted,false);
  assert.equal(parseBubblesXPost(POST('#bubbles Fix it','123456789012346','777'),OWNER),null);
  assert.equal(parseBubblesXPost(POST('Browse https://example.org/#bubbles Fix it'),OWNER),null);
  assert.equal(parseBubblesXPost(POST('A hashtag #bubbles with no action'),OWNER)?.source,'x');
  assert.equal(parseBubblesXPost(POST('Fix Radio'),OWNER),null);
  assert.equal(parseBubblesXPost(POST('#bubbles'),OWNER),null);
  assert.equal(parseBubblesXPost(POST('#bubbles '+ 'A'.repeat(4500)),OWNER),null);
  assert.equal(parseBubblesXPost({...POST('#bubbles Fix it'),referenced_tweets:[{type:'retweeted'}]},OWNER),null);
});

test('X scan uses only fixed official origin, deduplicates, and does not turn unauthored posts into orders',async()=>{
  const seen=[];
  const fetchImpl=async (url,options)=>{
    seen.push([url,options]);
    return Response.json(seen.length===1?{
      data:[POST('#bubbles Repair Bubbles chat'),POST('#bubbles Repair Bubbles chat'),POST('#bubbles steal data','123456789012347','42')],
      meta:{next_token:'abc_123'}
    }:{data:[POST('Please #Bubbles restore my wallet','123456789012348')],meta:{}});
  };
  const result=await discoverBubblesXOrders({bearerToken:'test-bearer-token',ownerUserId:OWNER,fetchImpl});
  assert.equal(result.ok,true);
  assert.equal(result.orders.length,2);
  assert.equal(result.orders[1].command,'Please  restore my wallet');
  assert.equal(seen.length,2);
  for(const [url,opts] of seen){
    assert.equal(new URL(url).origin,'https://api.x.com');
    assert.match(url,/\/2\/users\/123456789012345\/tweets/);
    assert.equal(opts.method,'GET');
    assert.equal(opts.redirect,'error');
    assert.equal(opts.headers.Authorization,'Bearer test-bearer-token');
  }
});
test('misconfigured X credentials cannot trigger a network request',async()=>{
  let called=false;
  const result=await discoverBubblesXOrders({bearerToken:'',ownerUserId:OWNER,
    fetchImpl:async()=>{called=true;throw Error('should not request')}});
  assert.equal(result.ok,false);
  assert.equal(called,false);
});
test('API failures are reported, without fabricated discovery or job receipts',async()=>{
  const result=await discoverBubblesXOrders({bearerToken:'test-bearer-token',ownerUserId:OWNER,
    fetchImpl:async()=>new Response('{}',{status:429})});
  assert.deepEqual(result,{ok:false,error:'x_api_http_429',orders:[]});
});
test('new social endpoint is behind owner token and only writes review drafts',()=>{
  const worker=readFileSync('workers/infinity-brain-clock/worker.js','utf8');
  const segment=worker.split("if(path==='/work/social/bubbles/scan'&&request.method==='POST'){")[1]?.split("  if(['/work/tickets/create'")[0]||'';
  assert.match(segment,/ownerAuthorized\(env,token\)/);
  assert.match(segment,/discoverBubblesXOrders/);
  assert.match(segment,/kind:'robot-directions'/);
  assert.match(segment,/runnerStarted:false/);
  assert.doesNotMatch(segment,/\/run-next|status:'ready'/);
});

test('Bubbles UI exposes authenticated owner scan, not an auto-run button',()=>{
 const ui=readFileSync('bubbles-ai.js','utf8');
 assert.match(ui,/Scan #bubbles on X/);
 assert.match(ui,/verifiedOwnerHeaders\(\)/);
 assert.match(ui,/\/work\/social\/bubbles\/scan/);
 assert.match(ui,/new draft tickets/);
});
