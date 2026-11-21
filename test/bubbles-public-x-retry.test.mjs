import test from 'node:test';
import assert from 'node:assert/strict';
import {scanPublicX} from '../workers/bubbles-public-x/worker.mjs';
const item='<div role="link" data-href="/YahooPingcwlz/status/2113352129427730641"><article><a href="/YahooPingcwlz">Owner</a><div class="a whitespace-pre-wrap b" dir="auto">Fix Bubbles #bubbles</div></article></div>';
function envWith(responses){
 const statements=[],calls=[];
 return {env:{BROWSER:{async quickAction(op,args){
  assert.equal(op,'content');calls.push(args.waitForTimeout);return new Response(responses.shift());
 }},DB:{prepare(sql){return{bind(...args){statements.push({sql,args});return{
  async run(){return {meta:{changes:1}}}
 }}}}}},
 calls,statements};
}
test('initial empty render retries and persists actual owner posts',async()=>{
 const {env,calls,statements}=envWith(['<p>Loading</p>',item]);
 const r=await scanPublicX(env);
 assert.equal(r.ok,true);assert.deepEqual(calls,[4800,8000]);assert.equal(r.newPosts,1);
 assert.ok(statements.some(s=>s.sql.includes('owner_x_posts')));
 assert.ok(statements.some(s=>s.args.includes('public_posts_observed')));
});
test('login wall is never a zero-post success',async()=>{
 const {env,calls,statements}=envWith(['<p>Log in to X</p>','<p>Log in to X</p>']);
 await assert.rejects(scanPublicX(env),/no_visible_public_owner_posts_after_retry/);
 assert.equal(calls.length,2);assert.ok(statements.some(s=>s.args.includes('blocked')));
});

test('Browser Run JSON content envelope yields actual authored posts',async()=>{
 const {env,calls,statements}=envWith([JSON.stringify({success:true,result:item})]);
 const result=await scanPublicX(env);
 assert.equal(result.status,'public_posts_observed');
 assert.equal(result.visibleCount,1);
 assert.equal(calls.length,1);
 const post=statements.find(s=>s.sql.includes('owner_x_posts'));
 assert.equal(post.args[0],'2113352129427730641');
 assert.equal(post.args[2],'Fix Bubbles #bubbles');
});

test('unsuccessful Browser Run envelope cannot save apparent posts',async()=>{
 const {env,statements}=envWith([JSON.stringify({success:false,result:item})]);
 await assert.rejects(scanPublicX(env),/browser_content_unavailable/);
 assert.equal(statements.some(s=>s.sql.includes('owner_x_posts')),false);
 assert.ok(statements.some(s=>s.args.includes('blocked')));
});

test('oversized or malformed browser output never persists posts',async()=>{
 for(const [body,error] of [['{broken-json',/browser_content_invalid/],['x'.repeat(2*1024*1024+1),/browser_content_too_large/]]){
  const {env,statements}=envWith([body]);
  await assert.rejects(scanPublicX(env),error);
  assert.equal(statements.some(s=>s.sql.includes('owner_x_posts')),false);
 }
});

