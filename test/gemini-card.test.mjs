import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GEMINI_CARD_PATH, handleGeminiCard} from '../workers/infinity-rogers/gemini-card.mjs';

const accountId='g'.repeat(43);
const auth='Bearer sq_'+'a'.repeat(40);
const endpoint='https://infinity-rogers.marvaseater.workers.dev'+GEMINI_CARD_PATH;
function fixture(verified=true){
 let requests=0, providerCalls=0, stored=0;
 const env={
  GEMINI_API_KEY:'private-gemini-api-key',
  CONNECTIONS_SERVICE:{fetch:async(_url,opts)=> {
   requests++;assert.equal(opts.headers.Authorization,auth);
   return Response.json({ok:true,accounts:verified?[{id:accountId,provider:'google',label:'member@example.test',status:'connected',expiresAt:Date.now()+300000,grantedActions:['identity.read']}]:[]});
  }},
  METER_DB:{prepare:()=>({bind:()=>({first:async()=>({requests:++stored})})})}
 };
 const request=(body={})=>new Request(endpoint,{method:'POST',headers:{Authorization:auth,Origin:'https://quantaphi.org','Content-Type':'application/json'},body:JSON.stringify({accountId,question:'Hello Gemini from this card',...body})});
 const provider=async(url,opts)=>{providerCalls++;assert.match(url,/generativelanguage.googleapis.com\/v1beta\/models\/gemini/);assert.equal(opts.headers['x-goog-api-key'],'private-gemini-api-key');return Response.json({candidates:[{content:{parts:[{text:'Real model response.'}]}}]});};
 return {env,request,provider,get requests(){return requests},get providerCalls(){return providerCalls}};
}
test('verified Google sign-in returns actual Gemini answer under the signed wallet',async()=>{
 const f=fixture();const res=await handleGeminiCard(f.request(),f.env,{fetcher:f.provider});
 assert.equal(res.status,200);const data=await res.json();
 assert.equal(data.ok,true);assert.equal(data.provider,'Gemini');
 assert.equal(data.answer,'Real model response.');assert.equal(data.accountId,accountId);
 assert.equal(f.requests,1);assert.equal(f.providerCalls,1);
 assert.doesNotMatch(JSON.stringify(data),/private-gemini-api-key/);
});
test('missing Google connection cannot call Gemini or spend a model request',async()=>{
 const f=fixture(false);const res=await handleGeminiCard(f.request(),f.env,{fetcher:()=>assert.fail('Model must not be called')});
 assert.equal(res.status,403);assert.equal((await res.json()).error,'google_connection_required');
 assert.equal(f.providerCalls,0);
});
test('identity sign-in alone does not authorize another Google account',async()=>{
 const f=fixture();const res=await handleGeminiCard(f.request({accountId:'x'.repeat(43)}),f.env,{fetcher:()=>assert.fail('No model call')});
 assert.equal(res.status,403);
});
test('Gemini cannot be used without a server-side provider key or meter',async()=>{
 const f=fixture();delete f.env.GEMINI_API_KEY;
 assert.equal((await (await handleGeminiCard(f.request(),f.env)).json()).error,'gemini_not_configured');
 f.env.GEMINI_API_KEY='private-key';delete f.env.METER_DB;
 assert.equal((await (await handleGeminiCard(f.request(),f.env)).json()).error,'gemini_meter_unavailable');
});
test('wrong or missing wallet credentials fail before provider calls',async()=>{
 const f=fixture(),req=f.request();
 const bare=new Request(req,{headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'}});
 assert.equal((await handleGeminiCard(bare,f.env)).status,401);
 const badOrigin=new Request(req,{headers:{Authorization:auth,Origin:'https://attacker.test','Content-Type':'application/json'}});
 assert.equal((await handleGeminiCard(badOrigin,f.env)).status,403);
 assert.equal(f.requests,0);
});
test('in-card Gemini keeps its own send and sign-in; no feed or viewer change',()=>{
 const page=readFileSync(new URL('../source-quick-cards.mjs',import.meta.url),'utf8');
 const source=readFileSync(new URL('../oracle-card-deck.js',import.meta.url),'utf8');
 assert.match(page,/function mountGeminiTools\(/);
 assert.match(page,/Connect another Google account/);
 assert.match(page,/Sign in with Google/);
 assert.match(page,/v1\/ai\/card\/gemini/);
 assert.match(page,/if\(card.id==='gemini'\)/);
 assert.match(source,/registerSourceCards/);
 assert.doesNotMatch(page,/window\.open\([^)]*gemini\.google\.com/);
});
