import {test} from 'node:test';
import assert from 'node:assert/strict';
import {metaAdapter,executeMeta} from '../workers/bubbles-connections/meta.mjs';
const adapter=()=>metaAdapter({clientId:'app',clientSecret:'secret',redirectUri:'https://quantaphi.org/api/bubbles/connections/meta/callback'});
test('OAuth asks only for explicitly selected Meta Page and Instagram permissions',()=>{
 const u=new URL(adapter().authorization({state:'state',actions:['pages.read','instagram.read']}));
 assert.equal(u.host,'www.facebook.com');assert.equal(u.searchParams.get('state'),'state');
 assert.match(u.searchParams.get('scope'),/instagram_basic/);
 assert.doesNotMatch(u.searchParams.get('scope'),/pages_manage_posts/);
 assert.throws(()=>adapter().authorization({state:'x',actions:['profile.read']}),/unsupported_action/);
});
test('Meta token exchange verifies profile and actual permission grants',async()=>{
 let n=0;const request=async url=>{
  n++;const value=n===1?{access_token:'short'}:n===2?{access_token:'long',expires_in:5184000}:n===3?{id:'123',name:'Owner'}:{data:[{permission:'pages_show_list',status:'granted'},{permission:'pages_read_engagement',status:'granted'}]};
  return Response.json(value);
 };
 const granted=await metaAdapter({clientId:'id',clientSecret:'secret',redirectUri:'https://quantaphi.org/api/bubbles/connections/meta/callback'},request).exchange({code:'private',actions:['pages.read','pages.publish']});
 assert.deepEqual(granted.grantedActions,['pages.read']);assert.equal(granted.subject,'123');assert.equal(n,4);
});
const page={id:'987',name:'Demo Page',access_token:'secret-page',tasks:['CREATE_CONTENT'],instagram_business_account:{id:'246',username:'studio'}};
function fixture(payloads=[]){
 const visited=[];const request=async(url,options)=>{visited.push({url,options});return Response.json(payloads.shift()||{data:[page]});};
 const service={withCredential:async({provider,action},fn)=>{assert.equal(provider,'meta');assert.ok(action);return fn('secret-user',{})}};
 return {visited,request,service};
}
test('Page picker strips private Page tokens, exposes only verified managed Pages',async()=>{
 const f=fixture();const result=await executeMeta(f.service,{userId:'alice',id:'connected',operation:'pages'},f.request);
 assert.equal(result.pages.length,1);assert.equal(result.pages[0].instagram.username,'studio');
 assert.ok(!JSON.stringify(result).includes('secret-page'));
});
test('wrong Page is rejected before any Page API call',async()=>{
 const f=fixture();await assert.rejects(executeMeta(f.service,{userId:'alice',id:'connected',operation:'facebook.feed',pageId:'999'},f.request),/meta_page_not_authorized/);
 assert.equal(f.visited.length,1);
});
test('live feed maps real API captions and media, no fabricated posts',async()=>{
 const f=fixture([{data:[page]},{data:[{id:'987_1',message:'Hello',full_picture:'https://example.com/a.jpg',created_time:'2026-10-31T00:00:00Z',permalink_url:'https://facebook.com/posts/1'}]}]);
 const data=await executeMeta(f.service,{userId:'alice',id:'c',operation:'facebook.feed',pageId:'987'},f.request);
 assert.equal(data.posts[0].caption,'Hello');assert.equal(data.posts[0].source,'Facebook');assert.equal(f.visited.length,2);
});
test('social write is blocked without explicit confirmation',async()=>{
 const f=fixture();await assert.rejects(executeMeta(f.service,{userId:'alice',id:'c',operation:'facebook.publish',pageId:'987',message:'hi'},f.request),/meta_publish_not_confirmed/);
 assert.equal(f.visited.length,1);
});
test('Instagram publish requires hosted authorized HTTPS image, not arbitrary remote URL',async()=>{
 const f=fixture();await assert.rejects(executeMeta(f.service,{userId:'alice',id:'c',operation:'instagram.publish',pageId:'987',message:'hi',imageUrl:'https://evil.test/image.jpg',confirmed:true},f.request),/meta_content_invalid/);
 assert.equal(f.visited.length,1);
});
