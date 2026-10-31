'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const vm=require('node:vm'),{webcrypto}=require('node:crypto');
const html=fs.readFileSync('wallet-recovery.html','utf8');
test("StarQuest cloud wallet recovery has one tightly allowlisted same-origin return",()=>{
 assert.match(html,/const RETURN_TO_STARQUEST=RECOVERY_PARAMS\.get\('returnTo'\)==='\/TV-Database\/'/);
 assert.match(html,/link\.href='\/TV-Database\/'/);
 assert.match(html,/RETURN_TO_BRAIN\?'\/#robotDirections':RETURN_TO_STARQUEST\?'\/TV-Database\/'/);
 assert.doesNotMatch(html,/location\.assign\(RECOVERY_PARAMS\.get\('returnTo'\)\)/);
});

function recoveryPage(search,{unifiedOk=true}={}){
 const elements=new Map(),cache=new Map(),navigation=[],requests=[];
 const element=id=>{
  if(!elements.has(id))elements.set(id,{hidden:true,textContent:'',value:'',disabled:false,className:'',children:[],
   listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},append(...items){this.children.push(...items);},
   replaceChildren(){this.children=[];},focus(){}});
  return elements.get(id);
 };
 const localStorage={getItem:key=>cache.get(key)||null,setItem:(key,value)=>cache.set(key,value),
  key:index=>[...cache.keys()][index],get length(){return cache.size;}};
 const star={username:'test-user',starCoins:0,pendingShareCredits:0,shareCount:0,ledger:[],watchHistory:[]};
 const scope={URLSearchParams,AbortController,TextEncoder,Date,Intl,setTimeout,clearTimeout,crypto:webcrypto,
  btoa:value=>Buffer.from(value,'binary').toString('base64'),localStorage,
  location:{search,hash:'',replace:path=>navigation.push(path),assign:path=>navigation.push(path)},
  document:{title:'',getElementById:element,querySelector:element,createElement:element},
  fetch:async(url,options)=>{
   requests.push(String(url));
   let data={ok:true};
   if(String(url).endsWith('/v1/bootstrap'))data={ok:true,importedLocalState:false,state:star};
   else if(String(url).includes('starquest-ledger')&&String(url).endsWith('/v1/state'))data={ok:true,state:star};
   else if(String(url).includes('unified-wallet'))data={ok:unifiedOk,user:{id:'test-identity',username:star.username},balances:{},tokens:[],history:[]};
   else if(String(url).includes('quanta-phi-ledger'))data={ok:true,balance:0,user_id:'test-identity'};
   return {ok:data.ok,json:async()=>data};
  }};
 vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],scope);
 return {element,navigation,requests,async signIn(){
  element('username').value='test-user';element('password').value='synthetic-test-password';
  await element('signin').listeners.submit({preventDefault(){}});
 }};
}

test('Coliseum account recovery returns to Zeus without minting or rewriting Cloudflare tokens',async()=>{
 const page=recoveryPage('?signin=starquest&returnTo=/coliseum/');
 assert.equal(page.element('signin').hidden,false);
 await page.signIn();
 assert.deepEqual(page.navigation,['/coliseum/']);
 assert.ok(page.requests.some(url=>url.endsWith('/v1/state')));
 assert.equal(page.element('password').value,'');
 const unknown=recoveryPage('?signin=starquest&returnTo=/coliseum/?unsafe=1');
 await unknown.signIn();assert.deepEqual(unknown.navigation,[]);
});
test('StarQuest sign-in opens directly and returns to Bubbles only after matching Unified Wallet verification',async()=>{
 const page=recoveryPage('?signin=starquest&returnTo=/bubbles.html');
 assert.equal(page.element('signin').hidden,false);
 assert.equal(page.element('ownerRecovery').hidden,true);
 await page.signIn();assert.deepEqual(page.navigation,['/bubbles.html']);
 assert.ok(page.requests.some(url=>url.includes('unified-wallet')));
 assert.ok(page.requests.every(url=>!url.includes('/oauth2/')));
 assert.equal(page.element('password').value,'');
 const unavailable=recoveryPage('?signin=starquest&returnTo=/bubbles.html',{unifiedOk:false});
 await unavailable.signIn();assert.deepEqual(unavailable.navigation,[]);
 const external=recoveryPage('?signin=starquest&returnTo=https://example.test');
 await external.signIn();assert.deepEqual(external.navigation,[]);
});
