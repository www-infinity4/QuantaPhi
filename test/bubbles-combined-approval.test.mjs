import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('workers/bubbles-cloud-browser/consent.mjs','utf8')
 .replace("import {DurableObject} from 'cloudflare:workers';","class DurableObject {constructor(ctx){this.ctx=ctx}}");
const {BrowserConsentStore}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function fixture(){const rows=new Map(),writes=[];const store=new BrowserConsentStore({storage:{
 get:async key=>rows.get(key),put:async(key,value)=>{writes.push(key);if(typeof key==='string')rows.set(key,value);else for(const [k,v] of Object.entries(key))rows.set(k,v);}
}});return {store,rows,writes}}
test('one explicit approval enables both grants with one atomic write and same five-day expiry',async()=>{
 const {store,rows,writes}=fixture(),before=Date.now();await store.enableChatGPT();
 assert.equal(writes.length,1);assert.equal(typeof writes[0],'object');
 const a=await store.status(),b=await store.chatgptStatus();
 assert.equal(a.enabled,true);assert.equal(b.enabled,true);assert.equal(a.expiresAt,b.expiresAt);
 assert.ok(b.expiresAt>=before+5*86400000&&b.expiresAt<=Date.now()+5*86400000);
 const count=writes.length;await store.chatgptStatus();await store.status();assert.equal(writes.length,count);
});
test('expiry and revocation remain enforced independently without status renewing consent',async()=>{
 const {store,rows}=fixture();await store.enableChatGPT();await store.revoke();
 assert.equal((await store.status()).enabled,false);assert.equal((await store.chatgptStatus()).enabled,true);
 await store.revokeChatGPT();assert.equal((await store.chatgptStatus()).enabled,false);
 rows.set('owner-chatgpt-bridge-consent',{enabled:true,expiresAt:Date.now()-1});
 assert.equal((await store.chatgptStatus()).enabled,false);
});
test('late owner restoration rechecks saved approval without granting new access',()=>{
 const ui=fs.readFileSync('bubbles-cloud-browser.mjs','utf8');
 const poll=ui.slice(ui.indexOf('async function pollChatGPT()'),ui.indexOf('// The session and owner token remain'));
 assert.ok(!poll.includes('||!chatgptApproved'));
 assert.ok(poll.includes("bridgeCall('permission',{action:'status'})"));
 assert.ok(poll.includes("if(saved.enabled!==true)return"));
 assert.ok(!poll.includes("action:'enable'"));
});
test('busy chat leaves the next job unclaimed; readiness resumes processing without renewing approval',async()=>{
 const ui=fs.readFileSync('bubbles-cloud-browser.mjs','utf8');
 const poll=ui.slice(ui.indexOf('async function pollChatGPT()'),ui.indexOf('// The session and owner token remain'));
 const calls=[],states=[];let ready=false;
 const window={dispatchEvent:event=>event.detail.respond(ready)};
 const Event=class{constructor(type,options){this.type=type;this.detail=options.detail}};
 const run=new Function('bridgeCall','window','consumerState','CustomEvent','bridgeStatus',
  'let chatgptApproved=false,bridgePolling=false,state=null;'+poll+';return pollChatGPT;')(
  async endpoint=>{calls.push(endpoint);return endpoint==='permission'?{enabled:true,expiresAt:Date.now()+1000}:{queue:'empty'}},
  window,(...state)=>states.push(state),Event,{});
 await run();assert.deepEqual(calls,['permission','heartbeat']);assert.equal(states.at(-1)[0],'waiting-for-chat');
 ready=true;await run();assert.deepEqual(calls,['permission','heartbeat','process']);assert.equal(states.at(-1)[0],'ready');
 const lifecycle=ui.slice(ui.indexOf("setInterval(()=>void pollChatGPT()"));
 for(const event of ['focus','pageshow','bubbles:owner-ready','visibilitychange'])assert.ok(lifecycle.includes(event));
 assert.ok(lifecycle.includes('void pollChatGPT();'));
});
test('consumer heartbeat reports observed readiness without extending either grant or storing identity',async()=>{
 const {store,rows,writes}=fixture();
 assert.equal((await store.consumerHeartbeat('ready')).status,403);
 await store.enableChatGPT();const expiry=(await store.chatgptStatus()).expiresAt;
 assert.equal((await store.consumerStatus()).state,'not_observed');
 assert.equal((await store.consumerHeartbeat('owner-secret')).status,400);
 await store.consumerHeartbeat('busy');assert.equal((await store.consumerStatus()).state,'busy');
 const saved=rows.get('owner-message-consumer');assert.deepEqual(Object.keys(saved).sort(),['seenAt','state']);
 rows.set('owner-message-consumer',{state:'ready',seenAt:Date.now()-60000});
 const before=writes.length;assert.equal((await store.consumerStatus()).state,'stale');assert.equal(writes.length,before);
 assert.equal((await store.chatgptStatus()).expiresAt,expiry);
 await store.revoke();assert.equal((await store.consumerHeartbeat('ready')).status,403);
 assert.equal((await store.consumerStatus()).state,'approval_inactive');
});
