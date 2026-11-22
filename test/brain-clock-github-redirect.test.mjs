import test from 'node:test';
import assert from 'node:assert/strict';
import './brain-deferred-recovery.test.mjs';
import './bubbles-work-receipt-readback.test.mjs';
import './bubbles-oauth-client-bootstrap.test.mjs';
import {githubReadNoRedirect} from '../workers/infinity-brain-clock/github-read-transport.mjs';

const endpoint='https://api.github.com/repos/www-infinity4/QuantaPhi/commits/abc';

test('authenticated GitHub read uses Cloudflare-supported manual redirect mode',async()=>{
 const calls=[];
 const reply={status:200,ok:true,json:async()=>({sha:'abc'})};
 const response=await githubReadNoRedirect(endpoint,{headers:{Authorization:'Bearer synthetic-test-token'},redirect:'error'},async(url,options)=>{
  calls.push({url,options});
  if(options.redirect!=='manual')throw new TypeError('Invalid redirect value');
  return reply;
 });
 assert.equal(response,reply);
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,endpoint);
 assert.equal(calls[0].options.redirect,'manual');
});

test('302 response is rejected without forwarding bearer token to another location',async()=>{
 const calls=[];
 await assert.rejects(githubReadNoRedirect(endpoint,{headers:{Authorization:'Bearer synthetic-test-token'}},async(url,options)=>{
  calls.push({url,options});
  return {status:302,ok:false,headers:{get:()=> 'https://other.example/request'}};
 }),/github_read_redirect_refused_302/);
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,endpoint);
 assert.equal(calls[0].options.redirect,'manual');
});

test('normal HTTP read failures stay visible to the existing caller',async()=>{
 const reply={status:403,ok:false};
 assert.equal(await githubReadNoRedirect(endpoint,{},async()=>reply),reply);
});

test('requests outside the GitHub API origin fail before any authenticated request',async()=>{
 let calls=0;
 await assert.rejects(githubReadNoRedirect('https://other.example/github',{headers:{Authorization:'Bearer synthetic-test-token'}},async()=>{calls++;}),/github_read_invalid_origin/);
 assert.equal(calls,0);
});
