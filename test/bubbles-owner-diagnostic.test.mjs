import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../bubbles-owner-diagnostic.js',import.meta.url),'utf8');

function node(){
 return {
  children:[],textContent:'',dataset:{},disabled:false,listeners:{},
  append(...items){this.children.push(...items)},
  replaceChildren(...items){this.children=items},
  addEventListener(type,listener){this.listeners[type]=listener}
 };
}

async function diagnosticFor(status,{networkFailure=false}={}){
 const elements=Object.fromEntries(['bubblesOwnerDiagnostics','bubblesOwnerDiagnosticResults','bubblesOwnerDiagnosticSummary','bubblesOwnerDiagnosticRun'].map(id=>[id,node()]));
 let requests=0;
 const context={
  document:{
   getElementById:id=>elements[id]||null,
   createElement:()=>node(),
   querySelectorAll:()=>[]
  },
  window:{QuantaBrainOwner:{diagnostics:()=>({owner:'unverified',bridge:'loaded',credential:'absent',server:'unverified',reason:'owner sign-in required'})}},
  fetch:async(url,options)=>{
   requests++;
   assert.equal(url,'https://infinity-brain-clock.marvaseater.workers.dev/health');
   assert.equal(options.cache,'no-store');
   assert.equal(options.headers?.Authorization,undefined,'never send owner credential in public diagnostic');
   if(networkFailure)throw Error('offline');
   return {ok:status>=200&&status<300,status};
  },
  AbortController,
  setTimeout:()=>1,
  clearTimeout:()=>{}
 };
 runInNewContext(source,context,{filename:'bubbles-owner-diagnostic.js'});
 elements.bubblesOwnerDiagnosticRun.listeners.click();
 await new Promise(resolve=>setImmediate(resolve));
 const rows=elements.bubblesOwnerDiagnosticResults.children;
 const row=rows.find(item=>item.children[0]?.textContent==='Brain health (owner-protected): ');
 assert.ok(row,'diagnostic must label owner-only Brain route accurately');
 return {message:row.children[1].textContent,requests,summary:elements.bubblesOwnerDiagnosticSummary.textContent};
}

test('Brain deliberately concealing owner health with 404 is not misreported as service failure',async()=>{
 const result=await diagnosticFor(404);
 assert.match(result.message,/not publicly verifiable/);
 assert.match(result.message,/owner-only protection or missing route/);
 assert.doesNotMatch(result.message,/service needs inspection|reachable/);
 assert.equal(result.requests,1);
 assert.match(result.summary,/needs attention/);
});

test('401/403 remain access controlled, not proof of owner authorization',async()=>{
 for(const status of [401,403]){
  const result=await diagnosticFor(status);
  assert.match(result.message,/access controlled/);
  assert.match(result.message,/owner session not established/);
 }
});

test('public 200 proves only response reachability, not verified owner session',async()=>{
 const result=await diagnosticFor(200);
 assert.match(result.message,/reachable \(HTTP 200\)/);
 assert.match(result.summary,/needs attention/);
});

test('network errors remain distinguishable from intentional owner protection',async()=>{
 const result=await diagnosticFor(0,{networkFailure:true});
 assert.match(result.message,/unreachable or blocked/);
});
